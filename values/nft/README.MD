### Criteria For Groups:

##Farmers

The OG farmers of Yam.

Staked with one of the 8 original incentivized pools 
```
'0x9ebb67687fee2d265d7b824714df13622d90e663' '0xc5b6488c7d5bed173b76bd5dca712f45fb9eaeab'
'0x587a07ce5c265a38dd6d42def1566ba73eeb06f5' '0x6c3fc1ffdb14d92394f40eec91d9ce8b807f132d'
'0xcfe1e539acb2d489a651ca011a6eb93d32f97e23' '0xFDC28897A1E32B595f1f4f1D3aE0Df93B1eee452'
'0x6009a344c7f993b16eba2c673fefd2e07f9be5fd' '0x8538e5910c6f80419cd3170c26073ff238048c9e'
```

blocks: 10636148 - 13026459

## Migrators

Migrated from V1 -> V2 or V2-> V3 

Had a transfer on one of the old contracts to `0x000000000000000000000000000000000000dead`
```solidity
Yamv1(0x0e2298E3B3390e3b945a5456fBf59eCc3f55DA16)
YAMv2(0xAba8cAc6866B83Ae4eec97DD07ED254282f6aD8A)
```
blocks: 10636148 - 13026459

## OnChainVoters

Had a VoteCast registered on contracts with a min 10 BoU Yam:
```solidity
GovernorAlphaV1: 0xC32f9b0292965c5dd4A0Ea1abfcC1f5a36d66986
GovernorAlpha2v2: 0x2da253835967d6e721c6c077157f9c9742934aea
```

blocks: 10636148 - 13026459

## OffChainVoters

Had a snapshot vote in the yam.eth space with a min 10 BoU Yam at a proposal's snapshot:
```solidity
votingPower = 
Yam(0x0AaCfbeC6a24756c20D41914F2caba817C0d8521).getPriorVotes(voter, snapshot) 
+
Incentivizer(0xD67c05523D8ec1c60760Fd017Ef006b9F6e496D0).getPriorVotes(voter, snapshot)
```

## Stakers

Have had more than 10 BoU Yam stake in the current incentivizer.
``` bash 
YAMIncentivizerWithVoting: 0xD67c05523D8ec1c60760Fd017Ef006b9F6e496D0
``` 

blocks: 10636148 - 13026459

## SynthLPs

Minted a YAM synth from Yam's asset.json


blocks:  11297178 - 13026459
