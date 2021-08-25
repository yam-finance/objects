import {utils} from "ethers";
import assetsInfo from "../assets.json"
import axios from "axios";
import * as fs from "fs";

const hre = require("hardhat")
import {
    YAMIncentivizerWithVoting__factory,
    YAMv2__factory,
    YAMIncentivizer__factory,
    YAMDelegator__factory,
    YamGovernorAlpha__factory,
    ExpiringMultiParty__factory
} from "~/types/abi";


const {formatUnits} = utils

async function searchForOriginalFarmers() {
    const FROM_BLOCK = 10636148  // August 11, 2020
    const TO_BLOCK = 13026459 // August 15, 2021

    const ORIGINAL_POOLS = [
        '0x9ebb67687fee2d265d7b824714df13622d90e663', '0xc5b6488c7d5bed173b76bd5dca712f45fb9eaeab',
        '0x587a07ce5c265a38dd6d42def1566ba73eeb06f5', '0x6c3fc1ffdb14d92394f40eec91d9ce8b807f132d',
        '0xcfe1e539acb2d489a651ca011a6eb93d32f97e23', '0xFDC28897A1E32B595f1f4f1D3aE0Df93B1eee452',
        '0x6009a344c7f993b16eba2c673fefd2e07f9be5fd', '0x8538e5910c6f80419cd3170c26073ff238048c9e'
    ]

    const incentivizers = ORIGINAL_POOLS.map((address) => {
        return YAMIncentivizer__factory.connect(address, hre.ethers.provider)
    })

    const farmers: string[] = []
    for (const incentivizer of incentivizers) {
        const logs = await incentivizer.queryFilter(incentivizer.filters.Staked(), FROM_BLOCK, TO_BLOCK)
        for (const log of logs) {
            if (!farmers.includes(log.args.user)) {
                farmers.push(log.args.user)
            }
        }
    }
    return farmers
}


async function searchForMigrators() {
    const FROM_BLOCK = 10636148    // August 11, 2020
    const TO_BLOCK = 13026459 // August 15, 2021

    const yamV1 = YAMDelegator__factory.connect("0x0e2298E3B3390e3b945a5456fBf59eCc3f55DA16", hre.ethers.provider)


    const v1ToV2Logs = await yamV1.queryFilter(yamV1.filters.Transfer(null, "0x000000000000000000000000000000000000dead"), FROM_BLOCK, TO_BLOCK)

    const yamv2 = YAMv2__factory.connect("0xAba8cAc6866B83Ae4eec97DD07ED254282f6aD8A", hre.ethers.provider)

    const v2ToV3Logs = await yamv2.queryFilter(yamv2.filters.Transfer(null, "0x000000000000000000000000000000000000dead"), FROM_BLOCK, TO_BLOCK)


    const migrators: string[] = []

    type YamEventLogs = typeof v1ToV2Logs | typeof v2ToV3Logs

    const aggregateMigrators = (logs: Array<YamEventLogs>) => {
        for (const versionLogs of logs) {
            for (const versionLog of versionLogs) {
                if (!migrators.includes(versionLog.args.from)) {
                    migrators.push(versionLog.args.from)
                }

            }
        }
    }

    aggregateMigrators([v1ToV2Logs, v2ToV3Logs])

    return migrators

}


async function searchForOnChainVoters() {
    const FROM_BLOCK = 10636148  // August 11, 2020
    const TO_BLOCK = 13026459 // August 15, 2021
    const MINIMUM_ELIGIBLE_VOTES = 10

    const yGovernorAlpha = YamGovernorAlpha__factory.connect("0xC32f9b0292965c5dd4A0Ea1abfcC1f5a36d66986", hre.ethers.provider)
    const yGovernorAlpha2 = YamGovernorAlpha__factory.connect("0x2da253835967d6e721c6c077157f9c9742934aea", hre.ethers.provider)

    const voteCastLogs = await yGovernorAlpha.queryFilter(yGovernorAlpha.filters.VoteCast(), FROM_BLOCK, TO_BLOCK)
    const voteCastLogs2 = await yGovernorAlpha2.queryFilter(yGovernorAlpha2.filters.VoteCast(), FROM_BLOCK, TO_BLOCK)


    const voters: string[] = []
    for (const voteCastLog of voteCastLogs) {
        if (!voters.includes(voteCastLog.args.voter)) {
            if (parseFloat(formatUnits(voteCastLog.args.votes, 24)) > MINIMUM_ELIGIBLE_VOTES) {
                voters.push(voteCastLog.args.voter)
            }
        }
    }

    for (const voteCastLog of voteCastLogs2) {
        if (!voters.includes(voteCastLog.args.voter)) {
            if (parseFloat(formatUnits(voteCastLog.args.votes, 24)) > MINIMUM_ELIGIBLE_VOTES) {
                voters.push(voteCastLog.args.voter)
            }
        }
    }


    return voters

}


async function searchForStakers() {
    const FROM_BLOCK = 10636148  // August 11, 2020
    const TO_BLOCK = 13026459 // August 15, 2021
    const MINIMUM_ELIGIBLE_VOTING_POWER = 10


    const yIncentivizer = YAMIncentivizerWithVoting__factory.connect("0xD67c05523D8ec1c60760Fd017Ef006b9F6e496D0", hre.ethers.provider)
    const stakeLogs = await yIncentivizer.queryFilter(yIncentivizer.filters.Staked(), FROM_BLOCK, TO_BLOCK)

    const voters: string[] = []
    for (const stakeLog of stakeLogs) {
        const user = stakeLog.args?.user
        if (!voters.includes(user)) {
            try {
                const incentivizerVotes = await yIncentivizer.getPriorVotes(user, stakeLog.blockNumber)
                if (parseFloat(formatUnits(incentivizerVotes, 24)) > MINIMUM_ELIGIBLE_VOTING_POWER) {
                    voters.push(stakeLog.args?.user)

                }
                await new Promise(r => setTimeout(r, 100)) // limit speed a bit
            } catch (e) {
                console.log("Ran into error in searchForStakers")
                console.log(e)
                console.log("waiting 5 seconds and trying again...")
                await new Promise(r => setTimeout(r, 5000))
                const incentivizerVotes = await yIncentivizer.getPriorVotes(user, stakeLog.blockNumber)
                if (parseFloat(formatUnits(incentivizerVotes, 24)) > MINIMUM_ELIGIBLE_VOTING_POWER) {
                    voters.push(stakeLog.args?.user)
                }
            }
        }
    }

    return voters

}


async function searchForOffChainVoters() {
    const MINIMUM_ELIGIBLE_VOTING_POWER = 10
    const query = `
    query Votes($skip:Int!) {
  votes (
    first:5000
    skip:$skip
    orderBy: "created",
    orderDirection: desc
    where: {
      space: "yam.eth"
      created_lt:1629309648
    }
  ) {
    voter
    proposal{
      snapshot
    }
  }
}`
    const snapshotToVoters: Record<string, any> = {}
    let skip = 0
    let totalVoters = 0
    while (true) {

        const results = await axios.post("https://hub.snapshot.org/graphql", {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            query,
            variables: {skip: skip}
        })

        type voteShape = {
            voter: string
            proposal: Record<"snapshot", string>
        }
        const votes = results.data.data['votes']

        if (votes.length === 0) {
            // no more votes to process.
            break
        }
        for (const vote of votes) {
            const shapedVote: voteShape = vote
            // only include voters once
            const seenSnapshots = Object.keys(snapshotToVoters)
            const isNewSnapshot = seenSnapshots.includes(shapedVote.proposal.snapshot)
            if (!isNewSnapshot) {
                snapshotToVoters[shapedVote.proposal.snapshot as string] = [shapedVote.voter]
                totalVoters += 1
            } else {
                if (!snapshotToVoters[shapedVote.proposal.snapshot as string].includes(shapedVote.voter)) {
                    snapshotToVoters[shapedVote.proposal.snapshot as string].push(shapedVote.voter)
                    totalVoters += 1
                }
            }
        }
        skip = skip + 5000

    }

    const voters: string[] = []
    const yDelegator = YAMDelegator__factory.connect("0x0AaCfbeC6a24756c20D41914F2caba817C0d8521", hre.ethers.provider)
    const yIncentivizer = YAMIncentivizerWithVoting__factory.connect("0xD67c05523D8ec1c60760Fd017Ef006b9F6e496D0", hre.ethers.provider)
    for (const block in snapshotToVoters) {
        const currentSnapshotvoters: string[] = snapshotToVoters[block]

        for (const voter of currentSnapshotvoters) {
            if (voters.includes(voter)) {
                continue
            }
            let delegatorVotes, incentivizerVotes
            try {
                delegatorVotes = await yDelegator.getPriorVotes(voter, block)
                incentivizerVotes = await yIncentivizer.getPriorVotes(voter, block)

            } catch (e) {
                console.log("Ran into error in searchForOffChainVoters")
                console.log("waiting 5 seconds and trying again...")
                await new Promise(r => setTimeout(r, 5000))
                delegatorVotes = await yDelegator.getPriorVotes(voter, block)
                incentivizerVotes = await yIncentivizer.getPriorVotes(voter, block)


            }

            const totalVotes = parseFloat(formatUnits(delegatorVotes ?? 0, 24)) + parseFloat(formatUnits(incentivizerVotes ?? 0, 24))
            if (totalVotes > MINIMUM_ELIGIBLE_VOTING_POWER) {
                voters.push(voter)
            }
            await new Promise(r => setTimeout(r, 100)) // limit speed a bit
        }
    }
    return voters

}


async function searchForSynthLP() {
    const FROM_BLOCK = 11297178  // Nov 20, 2020
    const TO_BLOCK = 13026459 // August 15, 2021

    let homesteadAssets = [] // We are only interested in the mainnet assets
    for (const assetGroup in assetsInfo["1"]) {
        const assetGroupKey = assetGroup as keyof typeof assetsInfo["1"]
        for (const asset of assetsInfo["1"][assetGroupKey]) {
            homesteadAssets.push(asset)
        }
    }
    let sponsors: Array<string> = []
    let emp
    for (const asset of homesteadAssets) {
        emp = ExpiringMultiParty__factory.connect(asset.emp.address, hre.ethers.provider)
        const assetLogs = await emp.queryFilter(emp.filters.NewSponsor(), FROM_BLOCK, TO_BLOCK)

        for (const assetLog of assetLogs) {
            if (!sponsors.includes(assetLog.args?.sponsor)) {
                sponsors.push(assetLog.args?.sponsor)
            }
        }
    }
    return sponsors

}


async function main() {
    const synthLPs = searchForSynthLP
    const offChainVoters = searchForOffChainVoters
    const onChainVoters = searchForOnChainVoters
    const stakers = searchForStakers
    const migrators = searchForMigrators
    const farmers = searchForOriginalFarmers

    const yammers = {
        synthLPs,
        stakers,
        offChainVoters,
        onChainVoters,
        farmers,
        migrators
    }

    for (const yammersGroup in yammers) {
        console.log(`Working on: ${yammersGroup}`)
        const addresses = await yammers[yammersGroup as keyof typeof yammers]()
        const jsonData = JSON.stringify({[yammersGroup]: addresses})
        console.log(`Writing: yammers_${yammersGroup}.json`)
        fs.writeFileSync(`yammers_${yammersGroup}.json`, jsonData)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
