export const ADAPTER_ABI = [
	{
		name: 'quote',
		type: 'function',
		stateMutability: 'view',
		inputs: [
			{ name: 'tokenIn', type: 'address' },
			{ name: 'tokenOut', type: 'address' },
			{ name: 'amountIn', type: 'uint256' },
		],
		outputs: [
			{ name: 'expectedOut', type: 'uint256' },
			{ name: 'routeData', type: 'bytes' },
		],
	},
	{
		name: 'swap',
		type: 'function',
		stateMutability: 'payable',
		inputs: [
			{ name: 'tokenIn', type: 'address' },
			{ name: 'tokenOut', type: 'address' },
			{ name: 'amountIn', type: 'uint256' },
			{ name: 'amountOutMin', type: 'uint256' },
			{ name: 'recipient', type: 'address' },
			{ name: 'routeData', type: 'bytes' },
		],
		outputs: [
			{ name: 'totalOut', type: 'uint256' },
		],
	},
	{
		name: 'minOut',
		type: 'function',
		stateMutability: 'pure',
		inputs: [
			{ name: 'quotedOut', type: 'uint256' },
			{ name: 'slippageBps', type: 'uint16' },
		],
		outputs: [
			{ name: '', type: 'uint256' },
		],
	},
	{
		name: 'decodeRoute',
		type: 'function',
		stateMutability: 'pure',
		inputs: [
			{ name: 'routeData', type: 'bytes' },
		],
		outputs: [
			{
				name: '',
				type: 'tuple[]',
				components: [
					{ name: 'isV3', type: 'bool' },
					{ name: 'path', type: 'address[]' },
					{ name: 'fees', type: 'uint24[]' },
					{ name: 'bps', type: 'uint16' },
				],
			},
		],
	},
] as const;
