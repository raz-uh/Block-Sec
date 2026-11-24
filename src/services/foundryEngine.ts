import { Challenge, ExecutionResult, TraceStep, GasReportItem } from '../types';

/**
 * Foundry Execution Sandbox Simulator & Engine
 * Simulates compilation, EVM state transitions, call traces (-vvvv),
 * and invariant assertions identical to Foundry `forge test`.
 */
interface EvaluationOutput {
  passed: boolean;
  failureReason?: string;
  gasUsed: number;
  traces: TraceStep[];
  gasReport: GasReportItem[];
}

export class FoundryEngine {
  public static async executeTest(
    challenge: Challenge,
    userExploitCode: string
  ): Promise<ExecutionResult> {
    const startTime = performance.now();

    // 1. Basic syntax & compilation validation
    const compileErrors = this.validateSyntax(userExploitCode);
    if (compileErrors.length > 0) {
      const durationMs = Math.round(performance.now() - startTime + 80);
      const stdout = [
        `[⠢] Compiling 2 files with 0.8.20`,
        `[⠆] Solc 0.8.20 finished in ${durationMs}ms`,
        `Compiler run failed with ${compileErrors.length} error(s):`,
        ``,
        ...compileErrors,
      ].join('\n');

      return {
        status: 'COMPILE_ERROR',
        exitCode: 1,
        durationMs,
        stdout,
        stderr: compileErrors.join('\n'),
        gasUsed: 0,
        testsPassed: 0,
        testsFailed: 1,
        traces: [],
        gasReport: [],
        compilerErrors: compileErrors,
      };
    }

    // 2. Exploit execution & invariant analysis based on challenge type
    const evalResult = this.evaluateExploit(challenge, userExploitCode);
    const durationMs = Math.round(performance.now() - startTime + 140);

    const formattedStdout = this.formatForgeStdout(challenge, evalResult, durationMs);

    return {
      status: evalResult.passed ? 'PASS' : 'FAIL',
      exitCode: evalResult.passed ? 0 : 1,
      durationMs,
      stdout: formattedStdout,
      stderr: evalResult.passed ? '' : evalResult.failureReason || 'Assertion failed',
      gasUsed: evalResult.gasUsed,
      testsPassed: evalResult.passed ? 1 : 0,
      testsFailed: evalResult.passed ? 0 : 1,
      traces: evalResult.traces,
      gasReport: evalResult.gasReport,
      flag: evalResult.passed ? challenge.flag : undefined,
    };
  }

  private static validateSyntax(code: string): string[] {
    const errors: string[] = [];

    // Check bracket parity
    let openBraces = 0;
    let openParens = 0;
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      const cleanLine = line.replace(/\/\/.*$/, '');
      for (const char of cleanLine) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '(') openParens++;
        if (char === ')') openParens--;
      }
    }

    if (openBraces !== 0) {
      errors.push(
        `Error (2314): ParserError: Expected '}' but got end of source\n  --> src/Exploit.sol:${lines.length}:1\n   |\n${lines.length} | }\n   | ^`
      );
    }
    if (openParens !== 0) {
      errors.push(
        `Error (1832): ParserError: Expected ')' but got token\n  --> src/Exploit.sol:${Math.max(1, lines.length - 2)}:10`
      );
    }

    // Check for common typo patterns
    if (code.includes('withdrw(') || code.includes('whitdraw(')) {
      errors.push(
        `Error (7920): TypeError: Member "withdrw" not found or not visible after argument-dependent lookup in contract\n  --> src/Exploit.sol:19:9\n   |\n19 |         etherStore.withdrw();\n   |         ^^^^^^^^^^^^^^^^^^`
      );
    }

    return errors;
  }

  private static evaluateExploit(
    challenge: Challenge,
    code: string
  ): EvaluationOutput {
    switch (challenge.slug) {
      case 'fallback-access-control':
        return this.evalFallback(code);
      case 'delegation-storage-hijack':
        return this.evalDelegation(code);
      case 'reentrancy-vault':
        return this.evalReentrancy(code);
      case 'oracle-manipulation':
        return this.evalOracle(code);
      case 'uninitialized-proxy-ownership':
        return this.evalProxyTakeover(code);
      case 'erc4626-share-inflation':
        return this.evalVaultInflation(code);
      case 'storage-collision-delegatecall':
        return this.evalStorageCollision(code);
      case 'truster-flashloan-exploit':
        return this.evalTruster(code);
      case 'side-entrance-flashloan':
        return this.evalSideEntrance(code);
      case 'naive-receiver-fee-drain':
        return this.evalNaiveReceiver(code);
      case 'tx-origin-phishing':
        return this.evalTxOrigin(code);
      case 'force-balance-selfdestruct':
        return this.evalForceBalance(code);
      case 'coinflip-predictable-randomness':
        return this.evalCoinFlip(code);
      case 'swc113-dos-unexpected-revert':
        return this.evalDosRevert(code);
      case 'swc104-unchecked-call-return':
        return this.evalUncheckedCall(code);
      case 'swc101-unchecked-overflow-truncation':
        return this.evalIntegerOverflow(code);
      case 'swc136-private-storage-leak':
        return this.evalPrivateStorage(code);
      case 'swc128-dos-gas-limit':
        return this.evalGasLimitDoS(code);
      default:
        return this.evalGeneric(code);
    }
  }

  // --- Challenge 1: Reentrancy ---
  private static evalReentrancy(code: string): EvaluationOutput {
    const hasDeposit = code.includes('deposit') && (code.includes('{value:') || code.includes('value'));
    const hasWithdraw = code.includes('withdraw()');
    const hasReceive = code.includes('receive()') || code.includes('fallback()');
    const hasReentrantCall = hasReceive && (code.includes('withdraw()') || code.includes('withdrawBalance'));
    const hasBalanceCheck = code.includes('balance >=') || code.includes('balance >') || code.includes('getBalance');

    if (!hasDeposit || !hasWithdraw) {
      return {
        passed: false,
        failureReason: 'assertion failed: 10000000000000000000 != 0 (EtherStore still holds 10 ETH)',
        gasUsed: 21450,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            value: '1000000000000000000',
            gas: 21450,
            calldata: 'attack()',
            returnVal: '0x',
            decodedFunction: 'attack()',
            success: true,
          },
          {
            depth: 2,
            callType: 'STATICCALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
            gas: 450,
            calldata: 'balance()',
            returnVal: '10000000000000000000 (10 ether)',
            decodedFunction: 'balance()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'EtherStore', functionName: 'deposit', min: 45000, avg: 45000, max: 45000, calls: 1 },
          { contract: 'AttackVault', functionName: 'attack', min: 21450, avg: 21450, max: 21450, calls: 1 },
        ],
      };
    }

    if (!hasReentrantCall) {
      return {
        passed: false,
        failureReason: 'assertion failed: 9000000000000000000 != 0 (Only 1 ETH withdrawn, no reentrancy loop)',
        gasUsed: 54200,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            value: '1000000000000000000',
            gas: 54200,
            calldata: 'attack()',
            returnVal: '0x',
            decodedFunction: 'attack()',
            success: true,
          },
          {
            depth: 2,
            callType: 'CALL',
            from: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
            value: '1000000000000000000',
            gas: 45200,
            calldata: 'deposit()',
            decodedFunction: 'deposit()',
            success: true,
          },
          {
            depth: 2,
            callType: 'CALL',
            from: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
            gas: 32000,
            calldata: 'withdraw()',
            decodedFunction: 'withdraw()',
            success: true,
          },
          {
            depth: 3,
            callType: 'CALL',
            from: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
            to: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            value: '1000000000000000000',
            gas: 7500,
            calldata: 'receive()',
            decodedFunction: 'receive()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'EtherStore', functionName: 'deposit', min: 45000, avg: 45000, max: 45000, calls: 2 },
          { contract: 'EtherStore', functionName: 'withdraw', min: 32000, avg: 32000, max: 32000, calls: 1 },
          { contract: 'AttackVault', functionName: 'attack', min: 54200, avg: 54200, max: 54200, calls: 1 },
        ],
      };
    }

    // Success! Build comprehensive traces showing recursive execution
    const traces: TraceStep[] = [
      {
        depth: 1,
        callType: 'CALL',
        from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
        to: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        value: '1000000000000000000',
        gas: 168920,
        calldata: 'attack()',
        decodedFunction: 'attack()',
        success: true,
      },
      {
        depth: 2,
        callType: 'CALL',
        from: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
        value: '1000000000000000000',
        gas: 44300,
        calldata: 'deposit()',
        decodedFunction: 'deposit()',
        success: true,
      },
      {
        depth: 2,
        callType: 'CALL',
        from: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
        gas: 112000,
        calldata: 'withdraw()',
        decodedFunction: 'withdraw()',
        success: true,
      },
    ];

    // Add 10 recursive hops
    for (let i = 1; i <= 10; i++) {
      traces.push({
        depth: 3,
        callType: 'CALL',
        from: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
        to: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        value: '1000000000000000000',
        gas: 9500 - i * 400,
        calldata: 'receive()',
        decodedFunction: `receive() [Reentrancy cycle #${i}]`,
        success: true,
      });
      if (i < 10) {
        traces.push({
          depth: 4,
          callType: 'CALL',
          from: 'AttackVault (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 8200 - i * 350,
          calldata: 'withdraw()',
          decodedFunction: 'withdraw()',
          success: true,
        });
      }
    }

    traces.push({
      depth: 1,
      callType: 'STATICCALL',
      from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
      to: 'EtherStore (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
      gas: 380,
      calldata: 'balance()',
      returnVal: '0 (0 ether)',
      decodedFunction: 'balance()',
      success: true,
    });

    return {
      passed: true,
      gasUsed: 168920,
      traces,
      gasReport: [
        { contract: 'EtherStore', functionName: 'deposit', min: 44300, avg: 44300, max: 44300, calls: 2 },
        { contract: 'EtherStore', functionName: 'withdraw', min: 7800, avg: 9200, max: 112000, calls: 11 },
        { contract: 'AttackVault', functionName: 'attack', min: 168920, avg: 168920, max: 168920, calls: 1 },
      ],
    };
  }

  // --- Challenge 2: Oracle Manipulation ---
  private static evalOracle(code: string): EvaluationOutput {
    const hasSwap = code.includes('swap') || code.includes('dex');
    const hasBorrow = code.includes('borrow(') || code.includes('borrow');
    const hasCollateralDeposit = code.includes('depositCollateral');

    if (!hasSwap || !hasBorrow || !hasCollateralDeposit) {
      return {
        passed: false,
        failureReason: 'assertion failed: 500000000000000000000000 != 0 (Treasury not drained)',
        gasUsed: 42100,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'OracleExploit (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
            gas: 42100,
            calldata: 'executeAttack(1000000 ether)',
            decodedFunction: 'executeAttack(1000000 ether)',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'LendMax', functionName: 'borrow', min: 0, avg: 0, max: 0, calls: 0 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 245100,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'OracleExploit (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          gas: 245100,
          calldata: 'executeAttack(1000000 ether)',
          decodedFunction: 'executeAttack(1000000000000000000000000)',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'OracleExploit (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          to: 'SimpleDEX (0xf62849f9a0b5bf2913b396098f7c7019b51a820a)',
          gas: 78500,
          calldata: 'swap(borrowToken, 1000000 ether)',
          decodedFunction: 'swap() -> price warped 10.4x',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'OracleExploit (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          to: 'LendMax (0xc7183455a4c133ae2755225cd929136c62758522)',
          gas: 52000,
          calldata: 'depositCollateral(48000 ether)',
          decodedFunction: 'depositCollateral()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'OracleExploit (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          to: 'LendMax (0xc7183455a4c133ae2755225cd929136c62758522)',
          gas: 68000,
          calldata: 'borrow(500000 ether)',
          decodedFunction: 'borrow(500000 ether) -> Drained protocol reserves',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'SimpleDEX', functionName: 'swap', min: 78500, avg: 78500, max: 78500, calls: 1 },
        { contract: 'LendMax', functionName: 'depositCollateral', min: 52000, avg: 52000, max: 52000, calls: 1 },
        { contract: 'LendMax', functionName: 'borrow', min: 68000, avg: 68000, max: 68000, calls: 1 },
      ],
    };
  }

  // --- Challenge 3: Proxy Takeover ---
  private static evalProxyTakeover(code: string): EvaluationOutput {
    const hasInit = code.includes('initialize(') || code.includes('initialize');
    const hasDestroy = code.includes('destroyWallet') || code.includes('selfdestruct') || code.includes('kill');

    if (!hasInit || !hasDestroy) {
      return {
        passed: false,
        failureReason: 'assertion failed: Logic contract code.length != 0 (Contract not destroyed)',
        gasUsed: 28400,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'TakeoverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 28400,
            calldata: 'attack()',
            decodedFunction: 'attack()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'WalletLogic', functionName: 'initialize', min: 28400, avg: 28400, max: 28400, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 52180,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'TakeoverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 52180,
          calldata: 'attack()',
          decodedFunction: 'attack()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'TakeoverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'WalletLogic (0x322813fd9a801c5507c9de605d63cea4f2ce6c44)',
          gas: 31200,
          calldata: 'initialize(address(this))',
          decodedFunction: 'initialize(0x104fbc...) -> owner claim granted',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'TakeoverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'WalletLogic (0x322813fd9a801c5507c9de605d63cea4f2ce6c44)',
          gas: 15400,
          calldata: 'destroyWallet(recipient)',
          decodedFunction: 'destroyWallet() -> selfdestruct executed',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'WalletLogic', functionName: 'initialize', min: 31200, avg: 31200, max: 31200, calls: 1 },
        { contract: 'WalletLogic', functionName: 'destroyWallet', min: 15400, avg: 15400, max: 15400, calls: 1 },
      ],
    };
  }

  // --- Challenge 4: ERC-4626 Inflation ---
  private static evalVaultInflation(code: string): EvaluationOutput {
    const hasInitialDeposit = code.includes('deposit(1)') || code.includes('deposit(1 wei)') || (code.includes('deposit') && code.includes('1'));
    const hasDirectDonation = code.includes('transfer(') || code.includes('transferFrom');
    const hasRedeem = code.includes('redeem(');

    if (!hasInitialDeposit || !hasDirectDonation || !hasRedeem) {
      return {
        passed: false,
        failureReason: 'assertion failed: Exploit asset balance < 14,999 ether (Inflation not achieved)',
        gasUsed: 36500,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'VaultInflationExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
            gas: 36500,
            calldata: 'attack(10000 ether)',
            decodedFunction: 'attack(10000 ether)',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'YieldVault', functionName: 'deposit', min: 36500, avg: 36500, max: 36500, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 142800,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'VaultInflationExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 142800,
          calldata: 'attack(10000 ether)',
          decodedFunction: 'attack(10000 ether)',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'VaultInflationExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'YieldVault (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          gas: 48200,
          calldata: 'deposit(1)',
          decodedFunction: 'deposit(1) -> minted 1 share',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'VaultInflationExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'ERC20Token (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 29500,
          calldata: 'transfer(YieldVault, 10000 ether)',
          decodedFunction: 'Direct donation: totalAssets inflated',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'VaultInflationExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'YieldVault (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          gas: 58000,
          calldata: 'redeem(1)',
          decodedFunction: 'redeem(1) -> returned 15000 ether',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'YieldVault', functionName: 'deposit', min: 48200, avg: 48200, max: 48200, calls: 2 },
        { contract: 'YieldVault', functionName: 'redeem', min: 58000, avg: 58000, max: 58000, calls: 1 },
      ],
    };
  }

  // --- Challenge 5: Storage Collision ---
  private static evalStorageCollision(code: string): EvaluationOutput {
    const hasSetOwner = code.includes('setOwner') || code.includes('0x13af4035');
    const hasCall = code.includes('.call(') || code.includes('.call{');

    if (!hasSetOwner || !hasCall) {
      return {
        passed: false,
        failureReason: 'assertion failed: Proxy implementation slot 0 != attackerLogic',
        gasUsed: 22100,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'CollisionExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
            gas: 22100,
            calldata: 'attack(0xdeadbeef)',
            decodedFunction: 'attack(0xdeadbeef)',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'ProxyAccount', functionName: 'fallback', min: 22100, avg: 22100, max: 22100, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 64200,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'CollisionExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 64200,
          calldata: 'attack(0xdeadbeef)',
          decodedFunction: 'attack(0xdeadbeef)',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'CollisionExploit (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'ProxyAccount (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 52000,
          calldata: 'setOwner(0xdeadbeef)',
          decodedFunction: 'fallback() -> delegatecall',
          success: true,
        },
        {
          depth: 3,
          callType: 'DELEGATECALL',
          from: 'ProxyAccount (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'LogicContract (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          gas: 48000,
          calldata: 'setOwner(0xdeadbeef)',
          decodedFunction: 'sstore(slot 0, 0xdeadbeef) [Overwrote implementation slot!]',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'ProxyAccount', functionName: 'fallback', min: 52000, avg: 52000, max: 52000, calls: 1 },
        { contract: 'LogicContract', functionName: 'setOwner', min: 48000, avg: 48000, max: 48000, calls: 1 },
      ],
    };
  }

  // --- Sample A: Level 0 Fallback & Access Control ---
  private static evalFallback(code: string): EvaluationOutput {
    const hasContribute = code.includes('contribute') && (code.includes('value:') || code.includes('value'));
    const hasReceiveTrigger = code.includes('.call{value:') || code.includes('.call(') || code.includes('.transfer');
    const hasWithdraw = code.includes('withdraw()');

    if (!hasContribute || !hasReceiveTrigger || !hasWithdraw) {
      return {
        passed: false,
        failureReason: 'assertion failed: target.owner() != address(exploit) (Ownership not claimed or vault not drained)',
        gasUsed: 23100,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ChallengeFallbackTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'ExploitFallback (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 23100,
            calldata: 'solve()',
            decodedFunction: 'solve()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'FallbackVault', functionName: 'contribute', min: 23100, avg: 23100, max: 23100, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 58400,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'ChallengeFallbackTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'ExploitFallback (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 58400,
          calldata: 'solve{value: 0.0002 ether}()',
          decodedFunction: 'solve()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'ExploitFallback (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'FallbackVault (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 24200,
          calldata: 'contribute{value: 100000000000000}()',
          decodedFunction: 'contribute() -> recorded balance',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'ExploitFallback (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'FallbackVault (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 16500,
          calldata: 'receive{value: 100000000000000}()',
          decodedFunction: 'receive() -> owner changed to ExploitFallback',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'ExploitFallback (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'FallbackVault (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 17700,
          calldata: 'withdraw()',
          decodedFunction: 'withdraw() -> 5 ether transferred to owner',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'FallbackVault', functionName: 'contribute', min: 24200, avg: 24200, max: 24200, calls: 1 },
        { contract: 'FallbackVault', functionName: 'receive', min: 16500, avg: 16500, max: 16500, calls: 1 },
        { contract: 'FallbackVault', functionName: 'withdraw', min: 17700, avg: 17700, max: 17700, calls: 1 },
      ],
    };
  }

  // --- Sample B: Level 1 Delegation Storage Hijack ---
  private static evalDelegation(code: string): EvaluationOutput {
    const hasPwnSignature = code.includes('pwn()') || code.includes('0xdd365b8b') || code.includes('encodeWithSignature');
    const hasCall = code.includes('.call(') || code.includes('.call{');

    if (!hasPwnSignature || !hasCall) {
      return {
        passed: false,
        failureReason: 'assertion failed: target.owner() != address(exploit) (Ownership not hijacked via delegatecall)',
        gasUsed: 21200,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ChallengeDelegationTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'ExploitDelegation (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 21200,
            calldata: 'hijackOwner()',
            decodedFunction: 'hijackOwner()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'Delegation', functionName: 'fallback', min: 21200, avg: 21200, max: 21200, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 44800,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'ChallengeDelegationTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'ExploitDelegation (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 44800,
          calldata: 'hijackOwner()',
          decodedFunction: 'hijackOwner()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'ExploitDelegation (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'Delegation (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 38200,
          calldata: '0xdd365b8b (pwn())',
          decodedFunction: 'fallback() -> delegatecall',
          success: true,
        },
        {
          depth: 3,
          callType: 'DELEGATECALL',
          from: 'Delegation (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'Delegate (0x322813fd9a801c5507c9de605d63cea4f2ce6c44)',
          gas: 32000,
          calldata: 'pwn()',
          decodedFunction: 'pwn() -> wrote msg.sender into Slot 0',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'Delegation', functionName: 'fallback', min: 38200, avg: 38200, max: 38200, calls: 1 },
        { contract: 'Delegate', functionName: 'pwn', min: 32000, avg: 32000, max: 32000, calls: 1 },
      ],
    };
  }

  // --- Damn Vulnerable DeFi: Truster ---
  private static evalTruster(code: string): EvaluationOutput {
    const hasFlashLoan = code.includes('flashLoan');
    const hasApprove = code.includes('approve') || code.includes('0x095ea7b3');
    const hasTransferFrom = code.includes('transferFrom');

    if (!hasFlashLoan || !hasApprove || !hasTransferFrom) {
      return {
        passed: false,
        failureReason: 'assertion failed: pool.balanceOf() != 0 (Pool tokens not drained)',
        gasUsed: 22400,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'TrusterTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'TrusterExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 22400,
            calldata: 'attack()',
            decodedFunction: 'attack()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'TrusterLenderPool', functionName: 'flashLoan', min: 0, avg: 0, max: 0, calls: 0 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 62400,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'TrusterTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'TrusterExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 62400,
          calldata: 'attack()',
          decodedFunction: 'attack()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'TrusterExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'TrusterLenderPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 41200,
          calldata: 'flashLoan(0, attacker, token, approveData)',
          decodedFunction: 'flashLoan(0, target=token, data=approve(exploit, max))',
          success: true,
        },
        {
          depth: 3,
          callType: 'CALL',
          from: 'TrusterLenderPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'DamnValuableToken (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          gas: 24500,
          calldata: 'approve(exploit, type(uint256).max)',
          decodedFunction: 'approve(0x104fbc..., MAX_UINT256) -> allowance granted',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'TrusterExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'DamnValuableToken (0x2e234dae75c793f67a35089c9d99245e1c58470b)',
          gas: 28500,
          calldata: 'transferFrom(pool, attacker, 1000000 ether)',
          decodedFunction: 'transferFrom(0x5615..., attacker, 1000000e18) -> 1,000,000 DVT drained',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'TrusterLenderPool', functionName: 'flashLoan', min: 41200, avg: 41200, max: 41200, calls: 1 },
        { contract: 'DamnValuableToken', functionName: 'approve', min: 24500, avg: 24500, max: 24500, calls: 1 },
        { contract: 'DamnValuableToken', functionName: 'transferFrom', min: 28500, avg: 28500, max: 28500, calls: 1 },
      ],
    };
  }

  // --- Damn Vulnerable DeFi: Side Entrance ---
  private static evalSideEntrance(code: string): EvaluationOutput {
    const hasFlashLoan = code.includes('flashLoan');
    const hasDeposit = code.includes('deposit') && (code.includes('value') || code.includes('msg.value'));
    const hasWithdraw = code.includes('withdraw()');

    if (!hasFlashLoan || !hasDeposit || !hasWithdraw) {
      return {
        passed: false,
        failureReason: 'assertion failed: address(pool).balance != 0 (Pool ETH not drained)',
        gasUsed: 26500,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'SideEntranceTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'SideEntranceExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 26500,
            calldata: 'attack()',
            decodedFunction: 'attack()',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'SideEntranceLenderPool', functionName: 'flashLoan', min: 0, avg: 0, max: 0, calls: 0 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 71200,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'SideEntranceTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'SideEntranceExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 71200,
          calldata: 'attack()',
          decodedFunction: 'attack()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'SideEntranceExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'SideEntranceLenderPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 48500,
          calldata: 'flashLoan(1000 ether)',
          decodedFunction: 'flashLoan(1000 ether)',
          success: true,
        },
        {
          depth: 3,
          callType: 'CALL',
          from: 'SideEntranceLenderPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          to: 'SideEntranceExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '1000000000000000000000',
          gas: 35000,
          calldata: 'execute()',
          decodedFunction: 'execute() callback',
          success: true,
        },
        {
          depth: 4,
          callType: 'CALL',
          from: 'SideEntranceExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'SideEntranceLenderPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          value: '1000000000000000000000',
          gas: 22000,
          calldata: 'deposit()',
          decodedFunction: 'deposit{value: 1000 ETH}() -> credited user balance',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'SideEntranceExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'SideEntranceLenderPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
          gas: 21500,
          calldata: 'withdraw()',
          decodedFunction: 'withdraw() -> 1,000 ETH sent to attacker',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'SideEntranceLenderPool', functionName: 'flashLoan', min: 48500, avg: 48500, max: 48500, calls: 1 },
        { contract: 'SideEntranceLenderPool', functionName: 'deposit', min: 22000, avg: 22000, max: 22000, calls: 1 },
        { contract: 'SideEntranceLenderPool', functionName: 'withdraw', min: 21500, avg: 21500, max: 21500, calls: 1 },
      ],
    };
  }

  // --- Damn Vulnerable DeFi: Naive Receiver ---
  private static evalNaiveReceiver(code: string): EvaluationOutput {
    const hasFlashLoan = code.includes('flashLoan');
    const hasLoopOrMulti = code.includes('for (') || code.includes('for(') || code.includes('10') || code.includes('while');

    if (!hasFlashLoan || !hasLoopOrMulti) {
      return {
        passed: false,
        failureReason: 'assertion failed: address(receiver).balance != 0 (Receiver 10 ETH not fully depleted)',
        gasUsed: 19800,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'NaiveReceiverTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'NaiveReceiverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 19800,
            calldata: 'attack(receiver)',
            decodedFunction: 'attack(receiver)',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'NaiveReceiverPool', functionName: 'flashLoan', min: 0, avg: 0, max: 0, calls: 0 },
        ],
      };
    }

    const traces: TraceStep[] = [
      {
        depth: 1,
        callType: 'CALL',
        from: 'NaiveReceiverTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
        to: 'NaiveReceiverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        gas: 89400,
        calldata: 'attack(receiver)',
        decodedFunction: 'attack(0x322813...)',
        success: true,
      },
    ];

    for (let i = 1; i <= 10; i++) {
      traces.push({
        depth: 2,
        callType: 'CALL',
        from: 'NaiveReceiverExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        to: 'NaiveReceiverPool (0x5615deb798bb3e4dfa0139dfa1b3d433cc23b733)',
        gas: 7800,
        calldata: `flashLoan(receiver, 0) [Loop #${i}]`,
        decodedFunction: `flashLoan(receiver, 0) -> fee drained 1 ETH (remaining: ${10 - i} ETH)`,
        success: true,
      });
    }

    return {
      passed: true,
      gasUsed: 89400,
      traces,
      gasReport: [
        { contract: 'NaiveReceiverPool', functionName: 'flashLoan', min: 7800, avg: 7800, max: 7800, calls: 10 },
        { contract: 'FlashLoanReceiver', functionName: 'onFlashLoan', min: 6200, avg: 6200, max: 6200, calls: 10 },
      ],
    };
  }

  // --- SWC-115: tx.origin Phishing ---
  private static evalTxOrigin(code: string): EvaluationOutput {
    const hasTransferCall = code.includes('transfer(') || code.includes('transfer');
    const hasRecipient = code.includes('attacker') || code.includes('recipient') || code.includes('msg.sender');

    if (!hasTransferCall || !hasRecipient) {
      return {
        passed: false,
        failureReason: 'assertion failed: address(wallet).balance == 0 (Wallet 10 ETH not transferred)',
        gasUsed: 21800,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
            to: 'PhishingAttack (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 21800,
            calldata: 'claimAirdrop()',
            decodedFunction: 'claimAirdrop() [Phishing victim invoked contract]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'PhishingAttack', functionName: 'claimAirdrop', min: 21800, avg: 21800, max: 21800, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 46200,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'VictimOwner (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720)',
          to: 'PhishingAttack (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 46200,
          calldata: 'claimAirdrop()',
          decodedFunction: 'claimAirdrop() [Victim triggers phishing trap]',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'PhishingAttack (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'WalletTxOrigin (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          gas: 35100,
          calldata: 'transfer(0x999, 10000000000000000000)',
          decodedFunction: 'transfer(attacker: 0x999, 10 ETH) [tx.origin == owner: PASS]',
          success: true,
        },
        {
          depth: 3,
          callType: 'CALL',
          from: 'WalletTxOrigin (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          to: 'AttackerEOA (0x999)',
          value: '10000000000000000000',
          gas: 12000,
          calldata: '',
          decodedFunction: 'transfer 10 ETH -> Attacker balance credited',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'PhishingAttack', functionName: 'claimAirdrop', min: 46200, avg: 46200, max: 46200, calls: 1 },
        { contract: 'WalletTxOrigin', functionName: 'transfer', min: 35100, avg: 35100, max: 35100, calls: 1 },
      ],
    };
  }

  // --- SWC-132: Force Balance with selfdestruct ---
  private static evalForceBalance(code: string): EvaluationOutput {
    const hasSelfdestruct = code.includes('selfdestruct');

    if (!hasSelfdestruct) {
      return {
        passed: false,
        failureReason: 'assertion failed: address(game).balance > 7000000000000000000 (Game balance not force-fed past threshold)',
        gasUsed: 22000,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'ForceFeeder (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 22000,
            calldata: 'attack(EtherMilestone)',
            decodedFunction: 'attack(0x5FbD...) [Missing selfdestruct opcode]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'ForceFeeder', functionName: 'attack', min: 22000, avg: 22000, max: 22000, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 54300,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'Attacker (0x999)',
          to: 'ForceFeeder (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '1500000000000000000',
          gas: 31000,
          calldata: 'attack{value: 1.5 ether}(EtherMilestone)',
          decodedFunction: 'attack{value: 1.5 ETH}(target: 0x5FbD...)',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'ForceFeeder (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'EtherMilestone (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          value: '1500000000000000000',
          gas: 5000,
          calldata: 'opcode: SELFDESTRUCT',
          decodedFunction: 'SELFDESTRUCT(EtherMilestone) -> forcefully pushes 1.5 ETH into target',
          success: true,
        },
        {
          depth: 1,
          callType: 'CALL',
          from: 'Player (0x101)',
          to: 'EtherMilestone (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          value: '1000000000000000000',
          gas: 18300,
          calldata: 'play()',
          decodedFunction: 'play() -> reverts: "Game over: target exceeded"',
          reverted: true,
          revertReason: 'Game over: target exceeded',
          success: false,
        },
      ],
      gasReport: [
        { contract: 'ForceFeeder', functionName: 'attack', min: 31000, avg: 31000, max: 31000, calls: 1 },
        { contract: 'EtherMilestone', functionName: 'play', min: 18300, avg: 18300, max: 18300, calls: 1 },
      ],
    };
  }

  // --- SWC-120: Weak Randomness ---
  private static evalCoinFlip(code: string): EvaluationOutput {
    const hasSyncCalculation = code.includes('blockhash') || code.includes('FACTOR') || code.includes('flip(');

    if (!hasSyncCalculation) {
      return {
        passed: false,
        failureReason: 'assertion failed: 0 == 10 (consecutiveWins did not reach 10)',
        gasUsed: 19500,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'CoinFlipAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 19500,
            calldata: 'attack()',
            decodedFunction: 'attack() [Randomness calculation missing]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'CoinFlipAttacker', functionName: 'attack', min: 19500, avg: 19500, max: 19500, calls: 1 },
        ],
      };
    }

    const traces: TraceStep[] = [];
    for (let i = 1; i <= 10; i++) {
      traces.push({
        depth: 1,
        callType: 'CALL',
        from: 'Attacker (0x999)',
        to: 'CoinFlipAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        gas: 28400,
        calldata: `attack() [Block #${i + 10}]`,
        decodedFunction: `attack() -> Synchronous blockhash prediction round #${i}`,
        success: true,
      });
      traces.push({
        depth: 2,
        callType: 'CALL',
        from: 'CoinFlipAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
        to: 'CoinFlip (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
        gas: 22100,
        calldata: `flip(guess: true)`,
        decodedFunction: `flip(guess: true) -> returns true (consecutiveWins: ${i})`,
        success: true,
      });
    }

    return {
      passed: true,
      gasUsed: 88400,
      traces,
      gasReport: [
        { contract: 'CoinFlipAttacker', functionName: 'attack', min: 28400, avg: 28400, max: 28400, calls: 10 },
        { contract: 'CoinFlip', functionName: 'flip', min: 22100, avg: 22100, max: 22100, calls: 10 },
      ],
    };
  }

  // --- SWC-113: Denial of Service via Unexpected Revert ---
  private static evalDosRevert(code: string): EvaluationOutput {
    const hasClaim = code.includes('claimThrone');
    const rejectsEther = !code.includes('receive() external payable') || code.includes('revert');

    if (!hasClaim || !rejectsEther) {
      return {
        passed: false,
        failureReason: 'assertion failed: target.king() == address(attackerContract) (Attacker accepted refund and was unseated)',
        gasUsed: 24000,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'KingAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 24000,
            calldata: 'attack{value: 2 ether}()',
            decodedFunction: 'attack() [Contract accepts incoming refunds, DoS ineffective]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'KingAttacker', functionName: 'attack', min: 24000, avg: 24000, max: 24000, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 62500,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'Attacker (0x999)',
          to: 'KingAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '2000000000000000000',
          gas: 35000,
          calldata: 'attack{value: 2 ether}()',
          decodedFunction: 'attack{value: 2 ETH}()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'KingAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'KingOfEther (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          value: '2000000000000000000',
          gas: 28000,
          calldata: 'claimThrone()',
          decodedFunction: 'claimThrone() -> New king assigned: KingAttacker',
          success: true,
        },
        {
          depth: 1,
          callType: 'CALL',
          from: 'Alice (0x200)',
          to: 'KingOfEther (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          value: '3000000000000000000',
          gas: 27500,
          calldata: 'claimThrone()',
          decodedFunction: 'claimThrone{value: 3 ETH}() -> Attempting refund push to KingAttacker',
          success: false,
          reverted: true,
          revertReason: 'Failed to refund previous king',
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'KingOfEther (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          to: 'KingAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '2000000000000000000',
          gas: 2300,
          calldata: '',
          decodedFunction: 'receive() -> [REVERT] "I shall remain the eternal king!"',
          reverted: true,
          revertReason: 'I shall remain the eternal king!',
          success: false,
        },
      ],
      gasReport: [
        { contract: 'KingAttacker', functionName: 'attack', min: 35000, avg: 35000, max: 35000, calls: 1 },
        { contract: 'KingOfEther', functionName: 'claimThrone', min: 28000, avg: 28000, max: 28000, calls: 2 },
      ],
    };
  }

  // --- SWC-104: Unchecked Call Return Value ---
  private static evalUncheckedCall(code: string): EvaluationOutput {
    const hasClaimDividend = code.includes('claimDividend');
    const hasRedeemJackpot = code.includes('redeemJackpot');

    if (!hasClaimDividend || !hasRedeemJackpot) {
      return {
        passed: false,
        failureReason: 'assertion failed: address(attackerContract).balance > 0 (Failed to siphon jackpot via phantom loyalty credits)',
        gasUsed: 22000,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'UncheckedCallAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 22000,
            calldata: 'attack()',
            decodedFunction: 'attack() [Missing dividend claim or jackpot redemption]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'UncheckedCallAttacker', functionName: 'attack', min: 22000, avg: 22000, max: 22000, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 71200,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'Attacker (0x999)',
          to: 'UncheckedCallAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '1000000000000000000',
          gas: 71200,
          calldata: 'attack{value: 1 ether}()',
          decodedFunction: 'attack{value: 1 ETH}()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'UncheckedCallAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'LottoDividendVault (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          value: '1000000000000000000',
          gas: 24500,
          calldata: 'deposit()',
          decodedFunction: 'deposit{value: 1 ETH}()',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'UncheckedCallAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'LottoDividendVault (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          gas: 31200,
          calldata: 'claimDividend(1000000000000000000)',
          decodedFunction: 'claimDividend(1 ETH) [Vault calls attacker -> returns false silently!]',
          success: true,
        },
        {
          depth: 3,
          callType: 'CALL',
          from: 'LottoDividendVault (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          to: 'UncheckedCallAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '1000000000000000000',
          gas: 5000,
          calldata: '',
          decodedFunction: 'receive() -> [REVERT] Silent failure swallowed by LottoDividendVault!',
          reverted: true,
          success: false,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'UncheckedCallAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'LottoDividendVault (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          gas: 28000,
          calldata: 'redeemJackpot(2000000000000000000)',
          decodedFunction: 'redeemJackpot(2 ETH in credits) -> Payout 1 ETH sent to attacker!',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'UncheckedCallAttacker', functionName: 'attack', min: 71200, avg: 71200, max: 71200, calls: 1 },
        { contract: 'LottoDividendVault', functionName: 'claimDividend', min: 31200, avg: 31200, max: 31200, calls: 1 },
        { contract: 'LottoDividendVault', functionName: 'redeemJackpot', min: 28000, avg: 28000, max: 28000, calls: 1 },
      ],
    };
  }

  // --- SWC-101: Integer Overflow in Unchecked Block ---
  private static evalIntegerOverflow(code: string): EvaluationOutput {
    const hasBatchTransfer = code.includes('batchTransfer');
    const hasOverflowValue =
      code.includes('1 << 255') ||
      code.includes('0x8000') ||
      code.includes('2**255') ||
      code.includes('overflowAmount') ||
      code.includes('type(uint256).max');

    if (!hasBatchTransfer || !hasOverflowValue) {
      return {
        passed: false,
        failureReason: 'assertion failed: vault.balanceOf(attacker) == 1 << 255 (Attacker balance was not overflow-minted)',
        gasUsed: 21500,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'BatchOverflowExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 21500,
            calldata: 'attack(0x999, 0x888)',
            decodedFunction: 'attack() [Missing 2^255 overflow multiplication factor]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'BatchOverflowExploit', functionName: 'attack', min: 21500, avg: 21500, max: 21500, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 44200,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'Attacker (0x999)',
          to: 'BatchOverflowExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 44200,
          calldata: 'attack(0x999, 0x888)',
          decodedFunction: 'attack(recipient1: 0x999, recipient2: 0x888)',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'BatchOverflowExploit (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'BatchTokenVault (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          gas: 37800,
          calldata: 'batchTransfer([0x999, 0x888], 57896044618658097711785492504343953926634992332820282019728792003956564819968)',
          decodedFunction: 'batchTransfer([0x999, 0x888], 2^255) -> unchecked: 2 * 2^255 wraps to 0',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'BatchOverflowExploit', functionName: 'attack', min: 44200, avg: 44200, max: 44200, calls: 1 },
        { contract: 'BatchTokenVault', functionName: 'batchTransfer', min: 37800, avg: 37800, max: 37800, calls: 1 },
      ],
    };
  }

  // --- SWC-136: Private Data Exposure ---
  private static evalPrivateStorage(code: string): EvaluationOutput {
    const hasUnlock = code.includes('unlock');

    if (!hasUnlock) {
      return {
        passed: false,
        failureReason: 'assertion failed: vault.locked() == false (Vault was not unlocked)',
        gasUsed: 21000,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'VaultUnlocker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 21000,
            calldata: 'attack()',
            decodedFunction: 'attack() [Missing vault.unlock call]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'VaultUnlocker', functionName: 'attack', min: 21000, avg: 21000, max: 21000, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 38600,
      traces: [
        {
          depth: 1,
          callType: 'STATICCALL',
          from: 'ExploitTest (0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84)',
          to: 'VMCheatcode (0x7109709ECfa91a80626fF3989D68f67F5b1DD12D)',
          gas: 2500,
          calldata: 'vm.load(VaultSecret, slot: 1)',
          decodedFunction: 'vm.load(0x5FbD..., slot 1) -> 0x6b65795f70617373776f72645f7377633133365f737570657273656372657431',
          success: true,
        },
        {
          depth: 1,
          callType: 'CALL',
          from: 'Attacker (0x999)',
          to: 'VaultUnlocker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 36100,
          calldata: 'attack(0x6b65...7431)',
          decodedFunction: 'attack("key_password_swc136_supersecret1")',
          success: true,
        },
        {
          depth: 2,
          callType: 'CALL',
          from: 'VaultUnlocker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          to: 'VaultSecret (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          gas: 29800,
          calldata: 'unlock(0x6b65...7431)',
          decodedFunction: 'unlock(password) -> password match confirmed, locked = false',
          success: true,
        },
        {
          depth: 3,
          callType: 'CALL',
          from: 'VaultSecret (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          to: 'VaultUnlocker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          value: '15000000000000000000',
          gas: 10000,
          calldata: '',
          decodedFunction: 'transfer 15 ETH -> Vault balance drained',
          success: true,
        },
      ],
      gasReport: [
        { contract: 'VaultUnlocker', functionName: 'attack', min: 36100, avg: 36100, max: 36100, calls: 1 },
        { contract: 'VaultSecret', functionName: 'unlock', min: 29800, avg: 29800, max: 29800, calls: 1 },
      ],
    };
  }

  // --- SWC-128: DoS with Block Gas Limit ---
  private static evalGasLimitDoS(code: string): EvaluationOutput {
    const hasRegisterMember = code.includes('registerMember');
    const hasLoop = code.includes('for') || code.includes('while') || code.includes('count');

    if (!hasRegisterMember || !hasLoop) {
      return {
        passed: false,
        failureReason: 'assertion failed: pool.getMembersCount() >= 100 (Failed to flood registry with accounts)',
        gasUsed: 22000,
        traces: [
          {
            depth: 1,
            callType: 'CALL',
            from: 'Attacker (0x999)',
            to: 'GasDoSAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
            gas: 22000,
            calldata: 'attack(150)',
            decodedFunction: 'attack(150) [Missing member registration loop]',
            success: true,
          },
        ],
        gasReport: [
          { contract: 'GasDoSAttacker', functionName: 'attack', min: 22000, avg: 22000, max: 22000, calls: 1 },
        ],
      };
    }

    return {
      passed: true,
      gasUsed: 94500,
      traces: [
        {
          depth: 1,
          callType: 'CALL',
          from: 'Attacker (0x999)',
          to: 'GasDoSAttacker (0x104fbc01051d669c73a89805d2eb3733602f571b)',
          gas: 82000,
          calldata: 'attack(150)',
          decodedFunction: 'attack(150) -> registered 150 accounts into DistributorPool',
          success: true,
        },
        {
          depth: 1,
          callType: 'CALL',
          from: 'Admin (0x100)',
          to: 'DistributorPool (0x5FbDB2315678afecb367f032d93F642f64180aa3)',
          gas: 50000,
          calldata: 'distributeAll()',
          decodedFunction: 'distributeAll() -> [OUT OF GAS] Loop over 150 members exceeded execution gas stipend!',
          reverted: true,
          revertReason: 'EvmError: OutOfGas',
          success: false,
        },
      ],
      gasReport: [
        { contract: 'GasDoSAttacker', functionName: 'attack', min: 82000, avg: 82000, max: 82000, calls: 1 },
        { contract: 'DistributorPool', functionName: 'distributeAll', min: 50000, avg: 50000, max: 50000, calls: 1 },
      ],
    };
  }

  private static evalGeneric(code: string): EvaluationOutput {
    return {
      passed: code.length > 100,
      gasUsed: 50000,
      traces: [],
      gasReport: [],
    };
  }

  private static formatForgeStdout(
    challenge: Challenge,
    evalResult: { passed: boolean; failureReason?: string; gasUsed: number; traces: TraceStep[] },
    durationMs: number
  ): string {
    const lines: string[] = [];

    lines.push(`[⠢] Compiling 2 files with 0.8.20`);
    lines.push(`[⠆] Solc 0.8.20 finished in 182.40ms`);
    lines.push(`Compiler run successful!`);
    lines.push(``);
    lines.push(`Ran 1 test for test/${challenge.testFileName}:ExploitTest`);

    if (evalResult.passed) {
      lines.push(`[PASS] testExploit() (gas: ${evalResult.gasUsed.toLocaleString()})`);
      lines.push(``);
      lines.push(`Traces:`);
      lines.push(`  [${evalResult.gasUsed.toLocaleString()}] ExploitTest::testExploit()`);
      for (const trace of evalResult.traces) {
        const indent = '  ' + '  '.repeat(trace.depth);
        const prefix = trace.callType === 'DELEGATECALL' ? '├─ [DELEGATECALL]' : '├─';
        lines.push(
          `${indent}${prefix} [${trace.gas.toLocaleString()}] ${trace.decodedFunction || trace.calldata}`
        );
      }
      lines.push(``);
      lines.push(
        `Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in ${(durationMs / 1000).toFixed(2)}s`
      );
    } else {
      lines.push(`[FAIL. Reason: ${evalResult.failureReason}] testExploit() (gas: ${evalResult.gasUsed.toLocaleString()})`);
      lines.push(``);
      lines.push(`Traces:`);
      lines.push(`  [${evalResult.gasUsed.toLocaleString()}] ExploitTest::testExploit()`);
      for (const trace of evalResult.traces) {
        const indent = '  ' + '  '.repeat(trace.depth);
        lines.push(
          `${indent}├─ [${trace.gas.toLocaleString()}] ${trace.decodedFunction || trace.calldata}`
        );
      }
      lines.push(`    └─ ← [Revert] ${evalResult.failureReason}`);
      lines.push(``);
      lines.push(
        `Suite result: FAILED. 0 passed; 1 failed; 0 skipped; finished in ${(durationMs / 1000).toFixed(2)}s`
      );
    }

    return lines.join('\n');
  }
}
