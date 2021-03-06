import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { BigNumber } from 'bignumber.js'
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Text,
  theme,
} from '@aragon/ui'
import { displayCurrency, getSymbol } from '../../utils/helpers'
import {
  AmountBadge,
  AverageRewards,
  AverageRewardsTable,
  NarrowList,
  NarrowListReward,
  RewardDescription,
  RewardsTable,
  formatAvgAmount,
} from './RewardsTables'
import { MILLISECONDS_IN_A_MONTH, blocksToMilliseconds, } from '../../../../../shared/ui/utils'
import { Empty } from '../Card'

const headersNames = fourth => [
  'Description',
  'Type',
  'id',
  'Cycle',
  fourth,
  'Amount',
]

const dot = <span style={{ margin: '0px 6px' }}>&middot;</span>

const averageRewardsTitles = [ 'Average Reward', 'Monthly Average', 'Total this year' ]
// TODO: these need to be actually calculated
const calculateAverageRewardsNumbers = ( rewards, claims, balances, convertRates ) => {
  if (Object.keys(claims).length > 0 && balances && convertRates) {
    return [
      formatAvgAmount(calculateAvgClaim(claims, balances, convertRates), '$'),
      formatAvgAmount(calculateMonthlyAvg(rewards, balances, convertRates), '$'),
      formatAvgAmount(calculateYTDRewards(rewards,balances, convertRates), '$'),
    ]
  }
  else {
    return Array(3).fill(formatAvgAmount(0, '$'))
  }
}

const calculateAvgClaim = ({ claimsByToken, totalClaimsMade }, balances, convertRates) => {
  return sumTotalRewards(
    claimsByToken,
    balances,
    convertRates,
    (claim, bal) => claim.address === bal.address
  ) / totalClaimsMade
}

const calculateMonthlyAvg = (rewards, balances, convertRates) => {
  let monthCount = Math.ceil((Date.now() - rewards.reduce((minDate, reward) => {
    return reward.endDate < minDate.endDate ? reward: minDate
  }).endDate) / MILLISECONDS_IN_A_MONTH)

  return sumTotalRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => rew.rewardToken === bal.address
  ) / monthCount
}

const calculateYTDRewards = (rewards, balances, convertRates) => {
  const yearBeginning = new Date(new Date(Date.now()).getFullYear(), 0)
  return sumTotalRewards(
    rewards,
    balances,
    convertRates,
    (rew, bal) => rew.rewardToken === bal.address && rew.endDate >= yearBeginning
  )
}

const sumTotalRewards = (rewards, balances, convertRates, rewardFilter) => {
  return balances.reduce((balAcc, balance) => {
    if (convertRates[balance.symbol]) {
      return rewards.reduce((rewAcc,reward) => {
        return (rewardFilter(reward, balance))
          ?
          BigNumber(reward.amount).div(Math.pow(10, balance.decimals)).div(convertRates[balance.symbol]).plus(rewAcc)
            .toNumber()
          :
          rewAcc
      },0) + balAcc
    }
    else return balAcc
  },0)
}

const generateOpenDetails = (reward, openDetails) => () => {
  openDetails(reward)
}

const getDividendCycle = ({ startBlock, endBlock }) => {
  const monthCount = Math.round(blocksToMilliseconds(startBlock, endBlock) / MILLISECONDS_IN_A_MONTH)

  switch (monthCount) {
  case 1:
    return 'Monthly'
  case 3:
    return 'Quarterly'
  default:
    return 'Custom'
  }
}

const RewardsTableNarrow = ({ tokens, rewards, fourthColumnData, openDetails }) => (
  <NarrowList>
    {rewards.map((reward, i) => (
      <NarrowListReward onClick={generateOpenDetails(reward, openDetails)} key={i}>
        <div style={{ marginTop: '5px', marginRight: '10px' }}>
          <RewardDescription>
            {reward.description}
          </RewardDescription>
          <Text.Block size="small" color={theme.textSecondary} style={{ marginTop: '5px' }}>
            {reward.isMerit ? 'Merit' : 'Dividend'}
            {dot}
            {reward.isMerit ? 'One-Time' : getDividendCycle(reward)}
            {dot}
            {fourthColumnData(reward)}
          </Text.Block>
        </div>
        <div>
          <AmountBadge>
            {displayCurrency(reward.amount)}{' '}{getSymbol(tokens, reward.rewardToken)}
          </AmountBadge>
        </div>
      </NarrowListReward>
    ))}
  </NarrowList>
)

RewardsTableNarrow.propTypes = {
  tokens: PropTypes.arrayOf(PropTypes.object).isRequired,
  openDetails: PropTypes.func.isRequired,
  rewards: PropTypes.arrayOf(PropTypes.object).isRequired,
  fourthColumnData: PropTypes.func.isRequired,
}

const RewardsTableWide = ({ tokens, rewards, fourthColumn, fourthColumnData, openDetails }) => {
  return (
    <Table
      style={{ width: '100%' }}
      header={
        <TableRow>
          {headersNames(fourthColumn).map(header => (
            <TableHeader key={header} title={header} />
          ))}
        </TableRow>
      }
    >
      {rewards.map((reward, i) => (
        <ClickableTableRow key={i} onClick={generateOpenDetails(reward, openDetails)}>
          <TableCell>
            <RewardDescription>
              {reward.description}
            </RewardDescription>
          </TableCell>
          <TableCell>
            {reward.isMerit ? 'Merit Reward' : 'Dividend'}
          </TableCell>
          <TableCell>
            Reward #{reward.rewardId}
          </TableCell>
          <TableCell>
            {reward.isMerit ? 'One-Time' : getDividendCycle(reward)}
          </TableCell>
          <TableCell>
            {fourthColumnData(reward)}
          </TableCell>
          <TableCell>
            <AmountBadge>
              {displayCurrency(reward.amount)}{' '}{getSymbol(tokens, reward.rewardToken)}
            </AmountBadge>
          </TableCell>
        </ClickableTableRow>
      ))}
    </Table>
  )}

RewardsTableWide.propTypes = {
  tokens: PropTypes.arrayOf(PropTypes.object).isRequired,
  openDetails: PropTypes.func.isRequired,
  rewards: PropTypes.arrayOf(PropTypes.object).isRequired,
  fourthColumn:PropTypes.string.isRequired,
  fourthColumnData: PropTypes.func.isRequired,
}

const displayNextPayout = reward => Intl.DateTimeFormat().format(reward.endDate)
const displayLastPayout = reward => Intl.DateTimeFormat().format(reward.endDate)
const futureRewards = rewards => rewards.filter(reward => reward.endDate > Date.now())
const pastRewards = rewards => rewards.filter(reward => reward.endDate <= Date.now())

const tableType = [
  { title: 'Current Rewards', fourthColumn: 'Next Payout', fourthColumnData: displayNextPayout, filterRewards: futureRewards },
  // This will be implemented after advanced forwarding is implemented in the Aragon API
  //{ title: 'Pending Rewards', fourthColumn: 'Status', fourthColumnData: displayStatus },
  { title: 'Past Rewards', fourthColumn: 'Last Payout', fourthColumnData: displayLastPayout, filterRewards: pastRewards },
]

const Overview = ({ tokens, rewards, convertRates, claims, newReward, openDetails }) => {
  const rewardsEmpty = rewards.length === 0

  // console.log('reward props: ', rewards)

  if (rewardsEmpty) {
    return <Empty tab='Overview' action={newReward} />
  }
  const averageRewardsNumbers = calculateAverageRewardsNumbers(rewards, claims, tokens, convertRates)
  return (
    <OverviewMain>
      <RewardsWrap>

        {(tokens && convertRates)
          ?
          <AverageRewards
            titles={averageRewardsTitles}
            numbers={averageRewardsNumbers}
          />
          :
          <AverageRewardsTable>
            <Text.Block size="large" weight="bold">
              Calculating summaries...
            </Text.Block>
          </AverageRewardsTable>
        }

        {tableType.map(({ title, fourthColumn, fourthColumnData, filterRewards }) => (
          filterRewards(rewards).length > 0
          &&
          <RewardsTable
            key={title}
            title={title}
            fourthColumn={fourthColumn}
            fourthColumnData={fourthColumnData}
            rewards={filterRewards(rewards)}
            tokens={tokens}
            openDetails={openDetails}
            belowMedium={RewardsTableNarrow}
            aboveMedium={RewardsTableWide}
          />
        ))}
      </RewardsWrap>
    </OverviewMain>
  )
}

Overview.propTypes = {
  tokens: PropTypes.arrayOf(PropTypes.object).isRequired,
  newReward: PropTypes.func.isRequired,
  openDetails: PropTypes.func.isRequired,
  rewards: PropTypes.arrayOf(PropTypes.object).isRequired,
  convertRates: PropTypes.object,
  claims: PropTypes.object.isRequired,
}

const OverviewMain = styled.div`
  background-color: #f8fcfd;
`
const RewardsWrap = styled.div`
  flex-grow: 1;
  > :not(:last-child) {
    margin-bottom: 20px;
  }
`
const ClickableTableRow = styled(TableRow)`
  :hover {
    cursor: pointer;
  }
`

// eslint-disable-next-line import/no-unused-modules
export default Overview
