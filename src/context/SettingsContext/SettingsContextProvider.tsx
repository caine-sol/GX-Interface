import noop from "lodash/noop";
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useMemo } from "react";

import { ARBITRUM, EXECUTION_FEE_CONFIG_V2, SUPPORTED_CHAIN_IDS } from "config/chains";
import { isDevelopment } from "config/env";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import {
  DISABLE_ORDER_VALIDATION_KEY,
  IS_PNL_IN_LEVERAGE_KEY,
  IS_AUTO_CANCEL_TPSL_KEY,
  ORACLE_KEEPER_INSTANCES_CONFIG_KEY,
  SHOULD_SHOW_POSITION_LINES_KEY,
  SHOW_DEBUG_VALUES_KEY,
  SHOW_PNL_AFTER_FEES_KEY,
  getAllowedSlippageKey,
  getExecutionFeeBufferBpsKey,
  getHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
  getSyntheticsAcceptablePriceImpactBufferKey,
} from "config/localStorage";
import { getOracleKeeperRandomIndex } from "config/oracleKeeper";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { tenderlyLsKeys } from "lib/tenderly";

export type SettingsContextType = {
  showDebugValues: boolean;
  setShowDebugValues: (val: boolean) => void;
  savedAllowedSlippage: number;
  setSavedAllowedSlippage: (val: number) => void;
  setExecutionFeeBufferBps: (val: number) => void;
  savedAcceptablePriceImpactBuffer: number;
  setSavedAcceptablePriceImpactBuffer: (val: number) => void;
  executionFeeBufferBps: number | undefined;
  shouldUseExecutionFeeBuffer: boolean;
  oracleKeeperInstancesConfig: { [chainId: number]: number };
  setOracleKeeperInstancesConfig: Dispatch<SetStateAction<{ [chainId: number]: number } | undefined>>;
  showPnlAfterFees: boolean;
  setShowPnlAfterFees: (val: boolean) => void;
  isPnlInLeverage: boolean;
  setIsPnlInLeverage: (val: boolean) => void;
  shouldDisableValidationForTesting: boolean;
  setShouldDisableValidationForTesting: (val: boolean) => void;
  shouldShowPositionLines: boolean;
  setShouldShowPositionLines: (val: boolean) => void;
  isAutoCancelTPSL: boolean;
  setIsAutoCancelTPSL: (val: boolean) => void;

  tenderlyAccountSlug: string | undefined;
  setTenderlyAccountSlug: (val: string | undefined) => void;
  tenderlyProjectSlug: string | undefined;
  setTenderlyProjectSlug: (val: string | undefined) => void;
  tenderlyAccessKey: string | undefined;
  setTenderlyAccessKey: (val: string | undefined) => void;
  tenderlySimulationEnabled: boolean | undefined;
  setTenderlySimulationEnabled: (val: boolean | undefined) => void;
};

export const SettingsContext = createContext({});

export function useSettings() {
  return useContext(SettingsContext) as SettingsContextType;
}

export function SettingsContextProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChainId();
  const [showDebugValues, setShowDebugValues] = useLocalStorageSerializeKey(SHOW_DEBUG_VALUES_KEY, false);
  const [savedAllowedSlippage, setSavedAllowedSlippage] = useLocalStorageSerializeKey(
    getAllowedSlippageKey(chainId),
    DEFAULT_SLIPPAGE_AMOUNT
  );

  const [savedAcceptablePriceImpactBuffer, setSavedAcceptablePriceImpactBuffer] = useLocalStorageSerializeKey(
    getSyntheticsAcceptablePriceImpactBufferKey(chainId),
    DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER
  );

  const [hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey, setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey] =
    useLocalStorageSerializeKey(getHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(chainId), false);

  let [executionFeeBufferBps, setExecutionFeeBufferBps] = useLocalStorageSerializeKey(
    getExecutionFeeBufferBpsKey(chainId),
    EXECUTION_FEE_CONFIG_V2[chainId]?.defaultBufferBps
  );
  const shouldUseExecutionFeeBuffer = Boolean(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);

  const [oracleKeeperInstancesConfig, setOracleKeeperInstancesConfig] = useLocalStorageSerializeKey(
    ORACLE_KEEPER_INSTANCES_CONFIG_KEY,
    SUPPORTED_CHAIN_IDS.reduce(
      (acc, chainId) => {
        acc[chainId] = getOracleKeeperRandomIndex(chainId);
        return acc;
      },
      {} as { [chainId: number]: number }
    )
  );

  const [savedShowPnlAfterFees, setSavedShowPnlAfterFees] = useLocalStorageSerializeKey(
    [chainId, SHOW_PNL_AFTER_FEES_KEY],
    true
  );

  const [savedIsPnlInLeverage, setSavedIsPnlInLeverage] = useLocalStorageSerializeKey(
    [chainId, IS_PNL_IN_LEVERAGE_KEY],
    false
  );

  const [savedIsAutoCancelTPSL, setIsAutoCancelTPSL] = useLocalStorageSerializeKey(
    [chainId, IS_AUTO_CANCEL_TPSL_KEY],
    true
  );

  const [tenderlyAccountSlug, setTenderlyAccountSlug] = useLocalStorageSerializeKey(tenderlyLsKeys.accountSlug, "");
  const [tenderlyProjectSlug, setTenderlyProjectSlug] = useLocalStorageSerializeKey(tenderlyLsKeys.projectSlug, "");
  const [tenderlyAccessKey, setTenderlyAccessKey] = useLocalStorageSerializeKey(tenderlyLsKeys.accessKey, "");
  const [tenderlySimulationEnabled, setTenderlySimulationEnabled] = useLocalStorageSerializeKey(
    tenderlyLsKeys.enabled,
    false
  );

  let savedShouldDisableValidationForTesting: boolean | undefined;
  let setSavedShouldDisableValidationForTesting: (val: boolean) => void;
  if (isDevelopment()) {
    // Safety: isDevelopment never changes
    // eslint-disable-next-line react-hooks/rules-of-hooks
    [savedShouldDisableValidationForTesting, setSavedShouldDisableValidationForTesting] = useLocalStorageSerializeKey(
      [chainId, DISABLE_ORDER_VALIDATION_KEY],
      false
    );
  } else {
    savedShouldDisableValidationForTesting = false;
    setSavedShouldDisableValidationForTesting = noop;
  }

  const [savedShouldShowPositionLines, setSavedShouldShowPositionLines] = useLocalStorageSerializeKey(
    [chainId, SHOULD_SHOW_POSITION_LINES_KEY],
    false
  );

  useEffect(() => {
    if (shouldUseExecutionFeeBuffer && executionFeeBufferBps === undefined) {
      setExecutionFeeBufferBps(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps);
    }
  }, [chainId, executionFeeBufferBps, setExecutionFeeBufferBps, shouldUseExecutionFeeBuffer]);

  useEffect(() => {
    if (!hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey && chainId === ARBITRUM) {
      setExecutionFeeBufferBps(EXECUTION_FEE_CONFIG_V2[chainId]?.defaultBufferBps);
      setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(true);
    }
  }, [
    chainId,
    hasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
    setExecutionFeeBufferBps,
    setHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey,
  ]);

  const contextState: SettingsContextType = useMemo(() => {
    return {
      showDebugValues: isDevelopment() ? showDebugValues! : false,
      setShowDebugValues,
      savedAllowedSlippage: savedAllowedSlippage!,
      setSavedAllowedSlippage,
      executionFeeBufferBps,
      setExecutionFeeBufferBps,
      shouldUseExecutionFeeBuffer,
      oracleKeeperInstancesConfig: oracleKeeperInstancesConfig!,
      setOracleKeeperInstancesConfig,
      savedAcceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer!,
      setSavedAcceptablePriceImpactBuffer,
      showPnlAfterFees: savedShowPnlAfterFees!,
      setShowPnlAfterFees: setSavedShowPnlAfterFees,
      isPnlInLeverage: savedIsPnlInLeverage!,
      setIsPnlInLeverage: setSavedIsPnlInLeverage,
      shouldDisableValidationForTesting: savedShouldDisableValidationForTesting!,
      setShouldDisableValidationForTesting: setSavedShouldDisableValidationForTesting,
      shouldShowPositionLines: savedShouldShowPositionLines!,
      setShouldShowPositionLines: setSavedShouldShowPositionLines,
      isAutoCancelTPSL: savedIsAutoCancelTPSL!,
      setIsAutoCancelTPSL: setIsAutoCancelTPSL,

      setTenderlyAccessKey,
      setTenderlyAccountSlug,
      setTenderlyProjectSlug,
      setTenderlySimulationEnabled,
      tenderlyAccessKey,
      tenderlyAccountSlug,
      tenderlyProjectSlug,
      tenderlySimulationEnabled,
    };
  }, [
    showDebugValues,
    setShowDebugValues,
    savedAllowedSlippage,
    setSavedAllowedSlippage,
    executionFeeBufferBps,
    setExecutionFeeBufferBps,
    shouldUseExecutionFeeBuffer,
    oracleKeeperInstancesConfig,
    setOracleKeeperInstancesConfig,
    savedAcceptablePriceImpactBuffer,
    setSavedAcceptablePriceImpactBuffer,
    savedShowPnlAfterFees,
    setSavedShowPnlAfterFees,
    savedIsPnlInLeverage,
    setSavedIsPnlInLeverage,
    savedShouldDisableValidationForTesting,
    setSavedShouldDisableValidationForTesting,
    savedShouldShowPositionLines,
    setSavedShouldShowPositionLines,
    setTenderlyAccessKey,
    setTenderlyAccountSlug,
    setTenderlyProjectSlug,
    setTenderlySimulationEnabled,
    tenderlyAccessKey,
    tenderlyAccountSlug,
    tenderlyProjectSlug,
    tenderlySimulationEnabled,
    savedIsAutoCancelTPSL,
    setIsAutoCancelTPSL,
  ]);

  return <SettingsContext.Provider value={contextState}>{children}</SettingsContext.Provider>;
}