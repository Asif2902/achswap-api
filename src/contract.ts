import { createPublicClient, encodeFunctionData, decodeFunctionResult, type Address, type Hex } from 'viem';
import { ARC_TESTNET, ADAPTER_ADDRESS, transport, ZERO_ADDRESS } from './config';
import { ADAPTER_ABI } from './abi';

const client = createPublicClient({ chain: ARC_TESTNET, transport });

function resolveToken(raw: string): Address {
	if (raw === 'native' || raw === 'USDC' || raw === '') return ZERO_ADDRESS;
	return raw as Address;
}

export async function quote(
	tokenIn: string,
	tokenOut: string,
	amountIn: bigint,
): Promise<{ expectedOut: bigint; routeData: Hex }> {
	const tIn = resolveToken(tokenIn);
	const tOut = resolveToken(tokenOut);

	const data = encodeFunctionData({
		abi: ADAPTER_ABI,
		functionName: 'quote',
		args: [tIn, tOut, amountIn],
	});

	const raw = await client.call({ to: ADAPTER_ADDRESS, data });

	const decoded = decodeFunctionResult({
		abi: ADAPTER_ABI,
		functionName: 'quote',
		data: raw.data as Hex,
	});

	return { expectedOut: decoded[0], routeData: decoded[1] as Hex };
}

export async function quoteMinOut(
	tokenIn: string,
	tokenOut: string,
	amountIn: bigint,
	slippageBps: number,
): Promise<{ expectedOut: string; minOut: string; routeData: Hex }> {
	const { expectedOut, routeData } = await quote(tokenIn, tokenOut, amountIn);

	const minData = encodeFunctionData({
		abi: ADAPTER_ABI,
		functionName: 'minOut',
		args: [expectedOut, slippageBps],
	});

	const minRaw = await client.call({ to: ADAPTER_ADDRESS, data: minData });

	const minDecoded = decodeFunctionResult({
		abi: ADAPTER_ABI,
		functionName: 'minOut',
		data: minRaw.data as Hex,
	});

	return {
		expectedOut: expectedOut.toString(),
		minOut: minDecoded.toString(),
		routeData,
	};
}

export async function decodeRoute(routeData: Hex): Promise<unknown> {
	const data = encodeFunctionData({
		abi: ADAPTER_ABI,
		functionName: 'decodeRoute',
		args: [routeData],
	});

	const raw = await client.call({ to: ADAPTER_ADDRESS, data });

	return decodeFunctionResult({
		abi: ADAPTER_ABI,
		functionName: 'decodeRoute',
		data: raw.data as Hex,
	});
}

export function buildSwapCalldata(
	tokenIn: string,
	tokenOut: string,
	amountIn: bigint,
	amountOutMin: bigint,
	recipient: Address,
	routeData: Hex,
): { data: Hex; value: bigint } {
	const tIn = resolveToken(tokenIn);

	const data = encodeFunctionData({
		abi: ADAPTER_ABI,
		functionName: 'swap',
		args: [resolveToken(tokenIn), resolveToken(tokenOut), amountIn, amountOutMin, recipient, routeData],
	});

	return { data, value: tIn === ZERO_ADDRESS ? amountIn : 0n };
}
