// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./DobermanConfig.sol";
import "./ConfigHelper.sol";
import "./BaseUpgradeablePausable.sol";
import "./Accountant.sol";
import "../../interfaces/IERC20withDec.sol";
import "../../interfaces/ICreditLine.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../library/SafeERC20Transfer.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

/**
 * @title CreditLine
 * @notice A contract that represents the agreement between Backers and
 *  a Borrower. Includes the terms of the loan, as well as the current accounting state, such as interest owed.
 *  A CreditLine belongs to a TranchedPool, and is fully controlled by that TranchedPool. It does not
 *  operate in any standalone capacity. It should generally be considered internal to the TranchedPool.
 * @author Doberman
 */

// solhint-disable-next-line max-states-count
contract CreditLine is BaseUpgradeablePausable, ICreditLine, SafeERC20Transfer {
  using SafeMath for uint256;

  uint256 public constant SECONDS_PER_DAY = 60;

  event DobermanConfigUpdated(address indexed who, address configAddress);
  event Bid(address indexed winner, uint256 livePrice);

  // Credit line terms
  address public override borrower;
  uint256 public currentLimit;
  uint256 public override maxLimit;
  uint256 public override interestApr;
  uint256 public override paymentPeriodInDays;
  uint256 public override termInDays;
  uint256 public override principalGracePeriodInDays;
  uint256 public override lateFeeApr;
  uint256 public override auctionEnd;
  address public auctionWinner;
  uint256 public auctionLivePrice;

  // Accounting variables
  uint256 public override balance;
  uint256 public override interestOwed;
  uint256 public override principalOwed;
  uint256 public override termEndTime;
  uint256 public override nextDueTime;
  uint256 public override interestAccruedAsOf;
  uint256 public override lastFullPaymentTime;
  uint256 public totalInterestAccrued;

  DobermanConfig public config;
  using ConfigHelper for DobermanConfig;

  function initialize(
    address _config,
    address owner,
    address _borrower,
    uint256 _maxLimit,
    uint256 _interestApr,
    uint256 _paymentPeriodInDays,
    uint256 _termInDays,
    uint256 _lateFeeApr,
    uint256 _principalGracePeriodInDays
  ) public initializer {
    require(_config != address(0) && owner != address(0) && _borrower != address(0), "Zero address passed in");
    __BaseUpgradeablePausable__init(owner);
    config = DobermanConfig(_config);
    borrower = _borrower;
    maxLimit = _maxLimit;
    interestApr = _interestApr;
    paymentPeriodInDays = _paymentPeriodInDays;
    termInDays = _termInDays;
    lateFeeApr = _lateFeeApr;
    principalGracePeriodInDays = _principalGracePeriodInDays;
    interestAccruedAsOf = block.timestamp;

    // Unlock owner, which is a TranchedPool, for infinite amount
    bool success = config.getUSDC().approve(owner, type(uint256).max);
    require(success, "Failed to approve USDC");
  }

  function limit() external view override returns (uint256) {
    return currentLimit;
  }

  /**
   * @notice Updates the internal accounting to track a drawdown as of current block timestamp.
   * Does not move any money
   * @param amount The amount in USDC that has been drawndown
   */
  function drawdown(uint256 amount) external onlyAdmin {
    require(amount.add(balance) <= currentLimit, "Cannot drawdown more than the limit");
    require(amount > 0, "Invalid drawdown amount");
    uint256 timestamp = currentTime();

    if (balance == 0) {
      setInterestAccruedAsOf(timestamp);
      setLastFullPaymentTime(timestamp);
      setTotalInterestAccrued(0);
      setTermEndTime(timestamp.add(SECONDS_PER_DAY.mul(termInDays)));
    }

    (uint256 _interestOwed, uint256 _principalOwed) = updateAndGetInterestAndPrincipalOwedAsOf(timestamp);
    balance = balance.add(amount);

    updateCreditLineAccounting(balance, _interestOwed, _principalOwed);
    require(!_isLate(timestamp), "Cannot drawdown when payments are past due");
  }

  /**
   * @notice Migrates to a new Doberman config address
   */
  function updateDobermanConfig() external onlyAdmin {
    config = DobermanConfig(config.configAddress());
    emit DobermanConfigUpdated(msg.sender, address(config));
  }

  function setAuctionEnd(uint256 newAuctionEnd) public onlyAdmin {
    _setAuctionEnd(newAuctionEnd);
  }

  function _setAuctionEnd(uint256 newAuctionEnd) internal {
    auctionEnd = newAuctionEnd;
  }

  function setAuctionWinner(address newAuctionWinner) public onlyAdmin {
    _setAuctionWinner(newAuctionWinner);
  }

  function _setAuctionWinner(address newAuctionWinner) internal {
    auctionWinner = newAuctionWinner;
  }

  function setAuctionLivePrice(uint256 newAuctionLivePrice) public onlyAdmin {
    _setAuctionLivePrice(newAuctionLivePrice);
  }

  function _setAuctionLivePrice(uint256 newAuctionLivePrice) internal {
    auctionLivePrice = newAuctionLivePrice;
  }

  function setLateFeeApr(uint256 newLateFeeApr) external onlyAdmin {
    lateFeeApr = newLateFeeApr;
  }

  function setLimit(uint256 newAmount) external onlyAdmin {
    require(newAmount <= maxLimit, "Cannot be more than the max limit");
    currentLimit = newAmount;
  }

  function setMaxLimit(uint256 newAmount) external onlyAdmin {
    maxLimit = newAmount;
  }

  function termStartTime() external view returns (uint256) {
    return _termStartTime();
  }

  function isLate() external view override returns (bool) {
    return _isLate(block.timestamp);
  }

  function withinPrincipalGracePeriod() external view override returns (bool) {
    if (termEndTime == 0) {
      // Loan hasn't started yet
      return true;
    }
    return block.timestamp < _termStartTime().add(principalGracePeriodInDays.mul(SECONDS_PER_DAY));
  }

  function setTermEndTime(uint256 newTermEndTime) public onlyAdmin {
    termEndTime = newTermEndTime;
  }

  function setNextDueTime(uint256 newNextDueTime) public onlyAdmin {
    nextDueTime = newNextDueTime;
  }

  function setBalance(uint256 newBalance) public onlyAdmin {
    balance = newBalance;
  }

  function setTotalInterestAccrued(uint256 _totalInterestAccrued) public onlyAdmin {
    totalInterestAccrued = _totalInterestAccrued;
  }

  function setInterestOwed(uint256 newInterestOwed) public onlyAdmin {
    interestOwed = newInterestOwed;
  }

  function setPrincipalOwed(uint256 newPrincipalOwed) public onlyAdmin {
    principalOwed = newPrincipalOwed;
  }

  function setInterestAccruedAsOf(uint256 newInterestAccruedAsOf) public onlyAdmin {
    interestAccruedAsOf = newInterestAccruedAsOf;
  }

  function setLastFullPaymentTime(uint256 newLastFullPaymentTime) public onlyAdmin {
    lastFullPaymentTime = newLastFullPaymentTime;
  }

  /**
   * @notice Triggers an assessment of the creditline. Any USDC balance available in the creditline is applied
   * towards the interest and principal.
   * @return Any amount remaining after applying payments towards the interest and principal
   * @return Amount applied towards interest
   * @return Amount applied towards principal
   */
  function assess()
    public
    onlyAdmin
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    // Do not assess until a full period has elapsed or past due
    require(balance > 0, "Must have balance to assess credit line");

    // Don't assess credit lines early!
    if (currentTime() < nextDueTime && !_isLate(currentTime())) {
      return (0, 0, 0);
    }
    uint256 timeToAssess = calculateNextDueTime();
    setNextDueTime(timeToAssess);

    // We always want to assess for the most recently *past* nextDueTime.
    // So if the recalculation above sets the nextDueTime into the future,
    // then ensure we pass in the one just before this.
    if (timeToAssess > currentTime()) {
      uint256 secondsPerPeriod = paymentPeriodInDays.mul(SECONDS_PER_DAY);
      timeToAssess = timeToAssess.sub(secondsPerPeriod);
    }
    return handlePayment(getUSDCBalance(address(this)), timeToAssess);
  }

  function calculateNextDueTime() public view returns (uint256) {
    uint256 newNextDueTime = nextDueTime;
    uint256 secondsPerPeriod = paymentPeriodInDays.mul(SECONDS_PER_DAY);
    uint256 curTimestamp = currentTime();
    // You must have just done your first drawdown
    if (newNextDueTime == 0 && balance > 0) {
      return curTimestamp.add(secondsPerPeriod);
    }

    // Active loan that has entered a new period, so return the *next* newNextDueTime.
    // But never return something after the termEndTime
    if (balance > 0 && curTimestamp >= newNextDueTime) {
      uint256 secondsToAdvance = (curTimestamp.sub(newNextDueTime).div(secondsPerPeriod)).add(1).mul(secondsPerPeriod);
      newNextDueTime = newNextDueTime.add(secondsToAdvance);
      return Math.min(newNextDueTime, termEndTime);
    }

    // You're paid off, or have not taken out a loan yet, so no next due time.
    if (balance == 0 && newNextDueTime != 0) {
      return 0;
    }
    // Active loan in current period, where we've already set the newNextDueTime correctly, so should not change.
    if (balance > 0 && curTimestamp < newNextDueTime) {
      return newNextDueTime;
    }
    revert("Error: could not calculate next due time.");
  }

  function currentTime() internal view virtual returns (uint256) {
    return block.timestamp;
  }

  function _isLate(uint256 timestamp) internal view returns (bool) {
    uint256 secondsElapsedSinceFullPayment = timestamp.sub(lastFullPaymentTime);
    return balance > 0 && secondsElapsedSinceFullPayment > paymentPeriodInDays.mul(SECONDS_PER_DAY);
  }

  function _termStartTime() internal view returns (uint256) {
    return termEndTime.sub(SECONDS_PER_DAY.mul(termInDays));
  }

  /**
   * @notice Applies `amount` of payment for a given credit line. This moves already collected money into the Pool.
   *  It also updates all the accounting variables. Note that interest is always paid back first, then principal.
   *  Any extra after paying the minimum will go towards existing principal (reducing the
   *  effective interest rate). Any extra after the full loan has been paid off will remain in the
   *  USDC Balance of the creditLine, where it will be automatically used for the next drawdown.
   * @param paymentAmount The amount, in USDC atomic units, to be applied
   * @param timestamp The timestamp on which accrual calculations should be based. This allows us
   *  to be precise when we assess a Credit Line
   */
  function handlePayment(uint256 paymentAmount, uint256 timestamp)
    internal
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    (uint256 newInterestOwed, uint256 newPrincipalOwed) = updateAndGetInterestAndPrincipalOwedAsOf(timestamp);
    Accountant.PaymentAllocation memory pa = Accountant.allocatePayment(
      paymentAmount,
      balance,
      newInterestOwed,
      newPrincipalOwed
    );

    uint256 newBalance = balance.sub(pa.principalPayment);
    // Apply any additional payment towards the balance
    newBalance = newBalance.sub(pa.additionalBalancePayment);
    uint256 totalPrincipalPayment = balance.sub(newBalance);
    uint256 paymentRemaining = paymentAmount.sub(pa.interestPayment).sub(totalPrincipalPayment);

    updateCreditLineAccounting(
      newBalance,
      newInterestOwed.sub(pa.interestPayment),
      newPrincipalOwed.sub(pa.principalPayment)
    );

    assert(paymentRemaining.add(pa.interestPayment).add(totalPrincipalPayment) == paymentAmount);

    return (paymentRemaining, pa.interestPayment, totalPrincipalPayment);
  }

  function updateAndGetInterestAndPrincipalOwedAsOf(uint256 timestamp) internal returns (uint256, uint256) {
    (uint256 interestAccrued, uint256 principalAccrued) = Accountant.calculateInterestAndPrincipalAccrued(
      this,
      timestamp,
      config.getLatenessGracePeriodInDays()
    );
    if (interestAccrued > 0) {
      // If we've accrued any interest, update interestAccruedAsOf to the time that we've
      // calculated interest for. If we've not accrued any interest, then we keep the old value so the next
      // time the entire period is taken into account.
      setInterestAccruedAsOf(timestamp);
      totalInterestAccrued = totalInterestAccrued.add(interestAccrued);
    }
    return (interestOwed.add(interestAccrued), principalOwed.add(principalAccrued));
  }

  function getInterestAndPrincipalOwedAsOfCurrent() public view returns (uint256, uint256){
    uint256 timeToAssess = calculateNextDueTime();
    if (timeToAssess > currentTime()) {
      uint256 secondsPerPeriod = paymentPeriodInDays.mul(SECONDS_PER_DAY);
      timeToAssess = timeToAssess.sub(secondsPerPeriod);
    }
    (uint256 interestAccrued, uint256 principalAccrued) = Accountant.calculateInterestAndPrincipalAccrued(
      this,
      timeToAssess,
      config.getLatenessGracePeriodInDays()
    );
    return (interestOwed.add(interestAccrued), principalOwed.add(principalAccrued));
  }

  function updateCreditLineAccounting(
    uint256 newBalance,
    uint256 newInterestOwed,
    uint256 newPrincipalOwed
  ) internal nonReentrant {
    setBalance(newBalance);
    setInterestOwed(newInterestOwed);
    setPrincipalOwed(newPrincipalOwed);

    // This resets lastFullPaymentTime. These conditions assure that they have
    // indeed paid off all their interest and they have a real nextDueTime. (ie. creditline isn't pre-drawdown)
    uint256 _nextDueTime = nextDueTime;
    if (newInterestOwed == 0 && _nextDueTime != 0) {
      // If interest was fully paid off, then set the last full payment as the previous due time
      uint256 mostRecentLastDueTime;
      if (currentTime() < _nextDueTime) {
        uint256 secondsPerPeriod = paymentPeriodInDays.mul(SECONDS_PER_DAY);
        mostRecentLastDueTime = _nextDueTime.sub(secondsPerPeriod);
      } else {
        mostRecentLastDueTime = _nextDueTime;
      }
      setLastFullPaymentTime(mostRecentLastDueTime);
    }

    setNextDueTime(calculateNextDueTime());
  }

  function getUSDCBalance(address _address) internal view returns (uint256) {
    return config.getUSDC().balanceOf(_address);
  }

  function bidWithPermit(uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
    uint256 timestamp = currentTime();
    require((timestamp > termEndTime + paymentPeriodInDays.mul(SECONDS_PER_DAY)) && balance > 0, "Loans is on time or fully repaid");

    // start bid
    if(auctionEnd == 0){
      _setAuctionEnd(timestamp.add(SECONDS_PER_DAY.mul(paymentPeriodInDays)));
      (uint256 interestOwe, uint256 principalOwe) = getInterestAndPrincipalOwedAsOfCurrent();
      require(amount >=interestOwe + principalOwe, "Start auction bid too low");
    }else {
      require(timestamp <= auctionEnd, "Auction end");
      uint256 increase = config.getMinBidIncrease() + 10000;
      require(amount * 10000 >= auctionLivePrice * increase, "Bid too low");
    }

    if(auctionEnd - timestamp <= 30 seconds) {
      _setAuctionEnd(auctionEnd + 30 seconds);
    }
    
    // return token to previous winner
    // start bid not need to execute
    if(auctionWinner != address(0)){
      safeERC20Transfer(config.getUSDC(), auctionWinner, auctionLivePrice);
    }

    // new winner transfer token to pool
    IERC20Permit(config.usdcAddress()).permit(msg.sender, address(this), amount, deadline, v, r, s);
    safeERC20TransferFrom(config.getUSDC(), msg.sender, address(this), amount);

    // update auction info
    _setAuctionWinner(msg.sender);
    _setAuctionLivePrice(amount);

    emit Bid(msg.sender, amount);
  }
}
