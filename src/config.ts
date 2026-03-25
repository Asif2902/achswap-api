import { defineChain, http } from 'viem';

export const ARC_TESTNET = defineChain({
	id: 5042002,
	name: 'ARC Testnet',
	nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
	rpcUrls: {
		default: { http: ['https://rpc.testnet.arc.network'] },
	},
	testnet: true,
});

export const RPC_URL = 'https://rpc.testnet.arc.network';

export const ADAPTER_ADDRESS = '0xF82c88FbF46E109a3865647E5c4d4834b31f8AFB' as const;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const transport = http(RPC_URL);
