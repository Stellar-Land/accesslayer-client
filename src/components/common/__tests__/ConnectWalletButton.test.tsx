import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(),
	useDisconnect: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseConnect = vi.mocked(useConnect);
const mockUseDisconnect = vi.mocked(useDisconnect);

const FULL_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

function setupConnectedWalletMocks(disconnect = vi.fn()) {
	mockUseAccount.mockReturnValue({
		address: FULL_ADDRESS,
		isConnected: true,
	} as ReturnType<typeof useAccount>);
	mockUseConnect.mockReturnValue({
		connect: vi.fn(),
		connectors: [],
		error: null,
		isPending: false,
	} as unknown as ReturnType<typeof useConnect>);
	mockUseDisconnect.mockReturnValue({
		disconnect,
	} as unknown as ReturnType<typeof useDisconnect>);

	return { disconnect };
}

describe('ConnectWalletButton wallet disconnect confirmation', () => {
	function renderConnectedWallet(disconnect = vi.fn()) {
		const result = setupConnectedWalletMocks(disconnect);
		render(<ConnectWalletButton />);
		return result;
	}

	it('opens a confirmation dialog before disconnecting', () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x12…5678/i }));

		expect(
			screen.getByRole('dialog', { name: /disconnect wallet/i })
		).toBeInTheDocument();
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('disconnects when the confirmation action is clicked', () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x12…5678/i }));
		fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));

		expect(disconnect).toHaveBeenCalledTimes(1);
	});

	it('cancels without disconnecting', async () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x12…5678/i }));
		fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('dismisses with Escape without disconnecting', async () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x12…5678/i }));
		fireEvent.keyDown(document, { key: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
		expect(disconnect).not.toHaveBeenCalled();
	});
});

describe('ConnectWalletButton copy wallet address', () => {
	beforeEach(() => {
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
	});

	function renderConnectedWallet() {
		setupConnectedWalletMocks();
		render(<ConnectWalletButton />);
	}

	it('shows a copy button when the wallet is connected', () => {
		renderConnectedWallet();

		expect(
			screen.getByRole('button', { name: /copy wallet address/i })
		).toBeInTheDocument();
	});

	it('copies the full unmasked address to the clipboard on click', async () => {
		renderConnectedWallet();

		fireEvent.click(
			screen.getByRole('button', { name: /copy wallet address/i })
		);

		await waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FULL_ADDRESS);
		});
	});

	it('shows a Copied! confirmation after clicking', async () => {
		renderConnectedWallet();

		fireEvent.click(
			screen.getByRole('button', { name: /copy wallet address/i })
		);

		expect(await screen.findByText('Copied!')).toBeInTheDocument();
	});

	it('removes the Copied! confirmation after 2 seconds', async () => {
		vi.useFakeTimers();
		renderConnectedWallet();

		fireEvent.click(
			screen.getByRole('button', { name: /copy wallet address/i })
		);

		// Flush the clipboard promise microtask so state updates land
		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText('Copied!')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(screen.queryByText('Copied!')).not.toBeInTheDocument();

		vi.useRealTimers();
	});
});
