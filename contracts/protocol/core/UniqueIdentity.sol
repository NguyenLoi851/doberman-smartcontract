// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import "../../external/ERC1155PresetPauserUpgradeable.sol";
import "../../interfaces/IUniqueIdentity.sol";

/**
 * @title UniqueIdentity
 * @notice UniqueIdentity is an ERC1155-compliant contract for representing
 * the identity verification status of addresses.
 * @author Doberman
 */

contract UniqueIdentity is ERC1155PresetPauserUpgradeable, IUniqueIdentity {
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    uint256 public constant ID_TYPE_0 = 0;
    uint256 public constant ID_TYPE_1 = 1;
    uint256 public constant ID_TYPE_2 = 2;
    uint256 public constant ID_TYPE_3 = 3;
    uint256 public constant ID_TYPE_4 = 4;
    uint256 public constant ID_TYPE_5 = 5;
    uint256 public constant ID_TYPE_6 = 6;
    uint256 public constant ID_TYPE_7 = 7;
    uint256 public constant ID_TYPE_8 = 8;
    uint256 public constant ID_TYPE_9 = 9;
    uint256 public constant ID_TYPE_10 = 10;

    uint256 public constant MINT_COST_PER_TOKEN = 830000 gwei;

    /// @dev We include a nonce in every hashed message, and increment the nonce as part of a
    /// state-changing operation, so as to prevent replay attacks, i.e. the reuse of a signature.
    mapping(address => uint256) public nonces;
    mapping(uint256 => bool) public supportedUIDTypes;

    bytes32 public DOMAIN_SEPARATOR =
        keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name())),
                keccak256(bytes(version)),
                block.chainid,
                address(this)
            )
        );

    // bytes32 public constant MINT_ALLOWANCE_TYPEHASH = keccak256("MintAllowance(address account,uint256 id,uint256 expiresAt,uint256 nonces)");
    bytes32 public constant MINT_ALLOWANCE_TYPEHASH =
        0x93433fbc09336ca8d52f54b6727e2a3c17e767104d1b90a87086b0792a8b7f97;

    /// @dev Version used for fund signature
    string public constant version = "1";

    function initialize(address owner, string memory uri) public initializer {
        require(owner != address(0), "Owner address cannot be empty");

        __ERC1155PresetPauser_init(owner, uri);
        __UniqueIdentity_init(owner);
    }

    // solhint-disable-next-line func-name-mixedcase
    function __UniqueIdentity_init(address owner) internal onlyInitializing {
        __UniqueIdentity_init_unchained(owner);
    }

    // solhint-disable-next-line func-name-mixedcase
    function __UniqueIdentity_init_unchained(
        address owner
    ) internal onlyInitializing {
        _setupRole(SIGNER_ROLE, owner);
        _setRoleAdmin(SIGNER_ROLE, OWNER_ROLE);
    }

    function setSupportedUIDTypes(
        uint256[] calldata ids,
        bool[] calldata values
    ) public onlyAdmin {
        require(
            ids.length == values.length,
            "accounts and ids length mismatch"
        );
        for (uint256 i = 0; i < ids.length; ++i) {
            supportedUIDTypes[ids[i]] = values[i];
        }
    }

    /**
     * @dev Gets the token name.
     * @return string representing the token name
     */
    function name() public pure returns (string memory) {
        return "Unique Identity";
    }

    /**
     * @dev Gets the token symbol.
     * @return string representing the token symbol
     */
    function symbol() public pure returns (string memory) {
        return "UID";
    }

    function mint(
        uint256 id,
        uint256 expiresAt,
        bytes calldata signature
    )
        public
        payable
        override
        onlySigner(_msgSender(), id, expiresAt, signature)
        incrementNonce(_msgSender())
    {
        require(
            msg.value >= MINT_COST_PER_TOKEN,
            "Token mint requires 0.00083 ETH"
        );
        require(supportedUIDTypes[id] == true, "Token id not supported");
        require(
            balanceOf(_msgSender(), id) == 0,
            "Balance before mint must be 0"
        );

        _mint(_msgSender(), id, 1, "");
    }

    function burn(
        address account,
        uint256 id,
        uint256 expiresAt,
        bytes calldata signature
    )
        public
        override
        onlySigner(account, id, expiresAt, signature)
        incrementNonce(account)
    {
        _burn(account, id, 1);

        uint256 accountBalance = balanceOf(account, id);
        require(accountBalance == 0, "Balance after burn must be 0");
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155PresetPauserUpgradeable) {
        require(
            (from == address(0) && to != address(0)) ||
                (from != address(0) && to == address(0)),
            "Only mint or burn transfers are allowed"
        );
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function _buildDomainSeparator() internal {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name())),
                keccak256(bytes(version)),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlySigner(
        address account,
        uint256 id,
        uint256 expiresAt,
        bytes calldata signature
    ) {
        require(block.timestamp < expiresAt, "Signature has expired");

        if (DOMAIN_SEPARATOR == bytes32(0)) {
            _buildDomainSeparator();
        }

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        MINT_ALLOWANCE_TYPEHASH,
                        address(account),
                        id,
                        expiresAt,
                        nonces[account]
                    )
                )
            )
        );

        require(
            hasRole(SIGNER_ROLE, ECDSAUpgradeable.recover(digest, signature)),
            "Invalid signer"
        );
        _;
    }

    modifier incrementNonce(address account) {
        nonces[account] += 1;
        _;
    }
}
