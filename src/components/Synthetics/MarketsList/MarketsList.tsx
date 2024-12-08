import { Trans } from "@lingui/macro";
import { useMemo, useState, useEffect } from "react";

import usePagination, { DEFAULT_PAGE_SIZE } from "components/Referrals/usePagination";
import { getIcon } from "config/icons";
import { useMarketsInfoDataToIndexTokensStats } from "context/SyntheticsStateContext/hooks/statsHooks";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { IndexTokenStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { stripBlacklistedWords } from "domain/tokens/utils";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";
import { formatAmount, formatRatePercentage, formatUsd, formatUsdPrice } from "lib/numbers";
import { useFuse } from "lib/useFuse";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { MarketListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { renderNetFeeHeaderTooltipContent } from "./NetFeeHeaderTooltipContent";
import { NetFeeTooltip } from "./NetFeeTooltip";
import Web3 from "web3";
import { ethers } from "ethers";
import contractABI from "../../../lib/oracleKeeperFetcher/ABI.json";
const contractAddress = "0xC156A62d422E06C94Ee2bE9D67da11b3b48B25B5";

import "./MarketsList.scss";

// Your Infura Project ID
const INFURA_PROJECT_ID = "866561e7397b4de796a87f7e2050afc5";

// Contract details
const CONTRACT_ADDRESS = "0xC156A62d422E06C94Ee2bE9D67da11b3b48B25B5";
const ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "getChainlinkDataFeedLatestAnswer",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
// const [xauPrice, setXauPrice] = useState(BigInt(0))
// Function to get the latest price
const fetchLatestAnswer = async () => {
  try {
    // Connect to Ethereum using Infura
    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${"866561e7397b4de796a87f7e2050afc5"}`);

    // Connect to the contract
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    // Call the contract function
    // console.log("OK");
    const latestAnswer = await contract.getChainlinkDataFeedLatestAnswer();

    console.log("Latest XAU/USD Price (Raw):", latestAnswer);
    // console.log("latestAnswer: ", latestAnswer);
    // console.log(typeof latestAnswer);
    const changedLatestAnswer = latestAnswer * 10n ** 22n;
    console.log("changedLatestAnswer: ", changedLatestAnswer);
    // const formattedPrice = ethers.formatUnits(latestAnswer, 8);
    // console.log("Formatted Price:1111", formattedPrice);
    return changedLatestAnswer;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};
// (async () => {
//   // Using an IIFE to resolve the Promise
//   xauPrice = await fetchLatestAnswer(); // Resolve the Promise
//   console.log("xauPrice =============>11: ", xauPrice);
// })()

const addXauTokenIfMissing = async (markets: IndexTokenStat[]): Promise<IndexTokenStat[]> => {
  if (markets.length === 0) return markets;

  let xauPrice: BigInt = (await fetchLatestAnswer()) ?? BigInt(0);
  console.log("XAU/USD Price:", xauPrice);
  let XAU_TOKEN_CONFIG = {
    address: "0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Es",
    symbol: "XAU",
    name: "Gold Spot Token",
    imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GM_LOGO.png",
    decimals: 18,
    isPlatformToken: true,
    // price
    prices: {
      minPrice: BigInt(xauPrice.toString()),
      maxPrice: BigInt(xauPrice.toString()),
    },
    coingeckoUrl: "",
    balance: BigInt(0),
  };
  // console.log("xauPrice =============>22: ", XAU_TOKEN_CONFIG);

  const hasXauToken = markets.some((item) => item.token.address === XAU_TOKEN_CONFIG.address);
  if (hasXauToken) return markets;

  console.log("---------------------", markets[1])

  const xauMarket: IndexTokenStat = {
    ...markets[0],
    marketsStats: [
      {
        ...markets[0].marketsStats[0],
        marketInfo: {
          ...markets[0].marketsStats[0].marketInfo,
          indexToken: {
            ...markets[0].marketsStats[0].marketInfo.indexToken,
            symbol: "XAU",
          },
        },
      },
      {
        ...markets[0].marketsStats[1],
        marketInfo: {
          ...markets[0].marketsStats[1].marketInfo,
          indexToken: {
            ...markets[0].marketsStats[1].marketInfo.indexToken,
            symbol: "XAU",
          },
        },
      },
      {
        ...markets[0].marketsStats[2],
        marketInfo: {
          ...markets[0].marketsStats[2].marketInfo,
          indexToken: {
            ...markets[0].marketsStats[2].marketInfo.indexToken,
            symbol: "XAU",
          },
        },
      },
    ],
    token: {
      ...markets[0].token,
      ...XAU_TOKEN_CONFIG,
    },
  };
  console.log(xauMarket);

  return [...markets, xauMarket];
};

export function MarketsList() {
  const { chainId } = useChainId();

  const indexTokensStats = useMarketsInfoDataToIndexTokensStats();

  return (
    <>
      <MarketsListDesktop chainId={chainId} indexTokensStats={indexTokensStats} />
    </>
  );
}

function MarketsListDesktop({ chainId, indexTokensStats }: { chainId: number; indexTokensStats: IndexTokenStat[] }) {
  const { orderBy, direction, getSorterProps } = useSorterHandlers<
    "price" | "tvl" | "liquidity" | "utilization" | "unspecified"
  >();
  const [searchText, setSearchText] = useState("");
  
  // First, add XAU token to the base list
  const [marketsWithXau, setMarketsWithXau] = useState<IndexTokenStat[]>([]);
  
  useEffect(() => {
    addXauTokenIfMissing(indexTokensStats).then((res) => {
      setMarketsWithXau(res);
    });
  }, [indexTokensStats]);

  // Then apply filtering and sorting on the complete list
  const sortedAndFilteredMarkets = useFilterSortMarkets({
    searchText,
    indexTokensStats: marketsWithXau, // Use the list that includes XAU
    orderBy,
    direction,
  });

  const { currentPage, currentData, pageCount, setCurrentPage } = usePagination(
    `${chainId} ${direction} ${orderBy} ${searchText}`,
    sortedAndFilteredMarkets,
    DEFAULT_PAGE_SIZE
  );

  return (
    <div className="my-15 rounded-4 bg-slate-800 text-left">
      <div className="flex items-center px-16 py-8 text-16">
        <Trans>GM Pools</Trans>
        <img className="ml-5 mr-10" src={getIcon(chainId, "network")} width="16" alt="Network Icon" />
        <SearchInput
          size="s"
          value={searchText}
          setValue={setSearchText}
          className="*:!text-16"
          placeholder="Search Market"
          autoFocus={false}
        />
      </div>
      <TableScrollFadeContainer>
        <table className="w-[max(100%,900px)]">
          <thead className="text-body-large">
            <TableTheadTr bordered>
              <TableTh>
                <Trans>MARKETS</Trans>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("price")}>
                  <Trans>PRICE</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("tvl")}>
                  <Trans comment="Total Value Locked">TVL</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("liquidity")}>
                  <Trans>LIQUIDITY</Trans>
                </Sorter>
              </TableTh>
              <TableTh>
                <TooltipWithPortal
                  handle={<Trans>NET RATE / 1 H</Trans>}
                  renderContent={renderNetFeeHeaderTooltipContent}
                />
              </TableTh>
              <TableTh>
                <Sorter {...getSorterProps("utilization")}>
                  <Trans>UTILIZATION</Trans>
                </Sorter>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {indexTokensStats.length > 0 &&
              currentData.length > 0 &&
              currentData.map((stats) => <MarketsListDesktopItem key={stats.token.address} stats={stats} />)}

            {indexTokensStats.length > 0 && !currentData.length && (
              <TableTr hoverable={false} bordered={false} className="h-[64.5px]">
                <TableTd colSpan={6} className="align-top text-gray-400">
                  <Trans>No markets found.</Trans>
                </TableTd>
              </TableTr>
            )}

            {indexTokensStats.length > 0 && currentData.length < DEFAULT_PAGE_SIZE && (
              <MarketListSkeleton
                invisible
                count={currentData.length === 0 ? DEFAULT_PAGE_SIZE - 1 : DEFAULT_PAGE_SIZE - currentData.length}
              />
            )}
            {!indexTokensStats.length && <MarketListSkeleton />}
          </tbody>
        </table>
      </TableScrollFadeContainer>
      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}

function useFilterSortMarkets({
  indexTokensStats,
  searchText,
  orderBy,
  direction,
}: {
  indexTokensStats: IndexTokenStat[];
  searchText: string;
  orderBy: string;
  direction: string;
}) {
  const fuse = useFuse(
    () =>
      indexTokensStats.map((indexTokenStat, index) => ({
        id: index,
        name: stripBlacklistedWords(indexTokenStat.token.name),
        symbol: indexTokenStat.token.symbol,
        address: indexTokenStat.token.address,
      })),
    indexTokensStats.map((indexTokenStat) => indexTokenStat.token.address)
  );

  const filteredMarkets = useMemo(() => {
    if (!searchText.trim()) {
      return indexTokensStats;
    }

    return fuse.search(searchText).map((result) => indexTokensStats[result.item.id]);
  }, [indexTokensStats, searchText, fuse]);

  const sortedMarkets = useMemo(() => {
    if (orderBy === "unspecified" || direction === "unspecified") {
      return filteredMarkets;
    }

    return filteredMarkets.slice().sort((a, b) => {
      // console.log("filteredMarkets--->", filteredMarkets);
      const directionMultiplier = direction === "asc" ? 1 : -1;

      if (orderBy === "price") {
        return a.token.prices?.minPrice > b.token.prices?.minPrice ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "tvl") {
        return a.totalPoolValue > b.totalPoolValue ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "liquidity") {
        return a.totalMaxLiquidity > b.totalMaxLiquidity ? directionMultiplier : -directionMultiplier;
      }

      if (orderBy === "utilization") {
        return a.totalUtilization > b.totalUtilization ? directionMultiplier : -directionMultiplier;
      }

      return 0;
    });
  }, [filteredMarkets, orderBy, direction]);

  return sortedMarkets;
}

function MarketsListDesktopItem({ stats }: { stats: IndexTokenStat }) {
  const anyPool = stats.marketsStats[0];

  const netFeePerHourLong = stats.bestNetFeeLong;
  const netFeePerHourShort = stats.bestNetFeeShort;
  const marketIndexName = getMarketIndexName(anyPool.marketInfo);

  return (
    <TableTr key={stats.token.symbol} bordered={false} hoverable={false}>
      <TableTd>
        <div className="token-symbol-wrapper">
          <div className="flex items-center">
            <div className="App-card-title-info-icon min-h-40">
              <img
                src={importImage("ic_" + stats.token.symbol.toLocaleLowerCase() + "_40.svg")}
                alt={stats.token.symbol}
                width="40"
              />
            </div>
            <div>
              <div className="text-body-large">{marketIndexName}</div>
            </div>
            <div>
              <AssetDropdown token={stats.token} />
            </div>
          </div>
        </div>
      </TableTd>
      <TableTd>
        {formatUsdPrice(stats.token.prices?.minPrice, {
          visualMultiplier: stats.token.visualMultiplier,
        })}
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          className="nowrap"
          handle={formatUsd(stats.totalPoolValue)}
          renderContent={() => (
            <>
              {stats.marketsStats.map(({ marketInfo, poolValueUsd }) => (
                <StatsTooltipRow
                  key={marketInfo.marketTokenAddress}
                  showDollar={false}
                  showColon
                  label={
                    <div className="inline-flex items-start">
                      <span>{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>:
                    </div>
                  }
                  value={formatUsd(poolValueUsd)}
                />
              ))}
            </>
          )}
        />
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          className="nowrap"
          handle={formatUsd(stats.totalMaxLiquidity)}
          renderContent={() => (
            <>
              {stats.marketsStats.map(({ marketInfo, maxLiquidity }) => (
                <StatsTooltipRow
                  key={marketInfo.marketTokenAddress}
                  showDollar={false}
                  showColon
                  label={
                    <div className="inline-flex items-start">
                      <span>{getMarketIndexName(marketInfo)}</span>
                      <span className="subtext leading-1">[{getMarketPoolName(marketInfo)}]</span>:
                    </div>
                  }
                  value={formatUsd(maxLiquidity)}
                />
              ))}
            </>
          )}
        />
      </TableTd>
      <TableTd>
        <TooltipWithPortal
          tooltipClassName="MarketList-netfee-tooltip"
          handle={`${formatRatePercentage(netFeePerHourLong)} / ${formatRatePercentage(netFeePerHourShort)}`}
          maxAllowedWidth={510}
          position="bottom-end"
          renderContent={() => <NetFeeTooltip marketStats={stats.marketsStats} />}
        />
      </TableTd>
      <TableTd>{formatAmount(stats.totalUtilization, 2, 2)}%</TableTd>
    </TableTr>
  );
}
