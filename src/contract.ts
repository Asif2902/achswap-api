import { createPublicClient, encodeFunctionData, decodeFunctionResult, type Address, type Hex } from 'viem';
import { ARC_TESTNET, ADAPTER_ADDRESS, transport, ZERO_ADDRESS } from './config';
import { ADAPTER_ABI } from './abi';

const client = createPublicClient({ chain: ARC_TESTNET, transport });

// quote() makes 20+ external calls (V2 router, V3 quoter, factories, pool checks).
// Ethers auto-estimates gas; viem does not. Without an explicit limit the RPC's
// default gas cap can cut off complex hop+split routes mid-execution.
const QUOTE_GAS = 25_000_000n;

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
	try {
		return await fn();
	} catch (e: any) {
		if (retries <= 0) throw e;
		await new Promise((r) => setTimeout(r, delay));
		return withRetry(fn, retries - 1, delay * 2);
	}
}

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

	const raw = await withRetry(() =>
		client.call({ to: ADAPTER_ADDRESS, data, gas: QUOTE_GAS }),
	);

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

	const minRaw = await withRetry(() =>
		client.call({ to: ADAPTER_ADDRESS, data: minData }),
	);

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
