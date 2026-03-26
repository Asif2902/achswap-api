import { quote, quoteMinOut, decodeRoute, buildSwapCalldata } from './contract';
import { ADAPTER_ADDRESS, ZERO_ADDRESS } from './config';
import type { Hex } from 'viem';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
	});
}

function errorJson(message: string, status = 400): Response {
	return json({ error: message }, status);
}

function parseAmount(raw: string, decimals: number): bigint {
	const [whole, frac = ''] = raw.split('.');
	const padded = frac.padEnd(decimals, '0').slice(0, decimals);
	return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded);
}

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

		const url = new URL(request.url);

		// ── GET /health ────────────────────────────────────────────────────
		if (url.pathname === '/health' && request.method === 'GET') {
			return json({
				status: 'ok',
				chainId: 5042002,
				adapter: ADAPTER_ADDRESS,
			});
		}

		// ── GET /quote?tokenIn=&tokenOut=&amountIn=&slippageBps=&decimals= ───
		if (url.pathname === '/quote' && request.method === 'GET') {
			const tokenIn = url.searchParams.get('tokenIn');
			const tokenOut = url.searchParams.get('tokenOut');
			const amountInRaw = url.searchParams.get('amountIn');
			const slippageBps = Number(url.searchParams.get('slippageBps') ?? '50');
			const decimals = Number(url.searchParams.get('decimals') ?? '18');

			if (!tokenIn || !tokenOut || !amountInRaw) {
				return errorJson('Missing tokenIn, tokenOut, or amountIn');
			}

			try {
				const amountIn = parseAmount(amountInRaw, decimals);
				if (amountIn <= 0n) return errorJson('amountIn must be > 0');

				const result = await quoteMinOut(tokenIn, tokenOut, amountIn, slippageBps);

				return json({
					tokenIn: tokenIn === 'native' || tokenIn === 'USDC' ? ZERO_ADDRESS : tokenIn,
					tokenOut: tokenOut === 'native' || tokenOut === 'USDC' ? ZERO_ADDRESS : tokenOut,
					amountIn: amountIn.toString(),
					expectedOut: result.expectedOut,
					minOut: result.minOut,
					slippageBps,
					routeData: result.routeData,
					adapter: ADAPTER_ADDRESS,
				});
			} catch (e: any) {
				return errorJson(e.message ?? 'Quote failed', 500);
			}
		}

		// ── GET /decode?routeData= ─────────────────────────────────────────
		if (url.pathname === '/decode' && request.method === 'GET') {
			const routeData = url.searchParams.get('routeData') as Hex | null;
			if (!routeData) return errorJson('Missing routeData');

			try {
			const rawSegments = await decodeRoute(routeData) as any[];
			const segments = rawSegments.map((s: any) => ({
				...s,
				bps: Number(s.bps),
				fees: s.isV3 ? s.fees : [3000],
			}));
			return json({ segments });
			} catch (e: any) {
				return errorJson(e.message ?? 'Decode failed', 500);
			}
		}

		// ── POST /swap-tx ──────────────────────────────────────────────────
		if (url.pathname === '/swap-tx' && request.method === 'POST') {
			const body = await request.json<{
				tokenIn?: string;
				tokenOut?: string;
				amountIn?: string;
				amountOutMin?: string;
				recipient?: string;
				routeData?: string;
			}>();

			const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, routeData } = body;

			if (!tokenIn || !tokenOut || !amountIn || !amountOutMin || !recipient || !routeData) {
				return errorJson(
					'Missing fields: tokenIn, tokenOut, amountIn, amountOutMin, recipient, routeData',
				);
			}

			try {
				const { data, value } = buildSwapCalldata(
					tokenIn,
					tokenOut,
					BigInt(amountIn),
					BigInt(amountOutMin),
					recipient as Hex,
					routeData as Hex,
				);

				return json({
					to: ADAPTER_ADDRESS,
					data,
					value: value.toString(),
					chainId: 5042002,
				});
			} catch (e: any) {
				return errorJson(e.message ?? 'Build swap tx failed', 500);
			}
		}

		return errorJson('Not Found', 404);
	},
} satisfies ExportedHandler<Env>;
