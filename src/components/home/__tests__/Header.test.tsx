import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';

import Header from '@/components/home/Header';
import { useAccount } from 'wagmi';
import { shortenAddress } from '@/lib/web3/format';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);

const KNOWN_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

function renderHeader(connected = false, address: string | null = null) {
	mockUseAccount.mockReturnValue({
		address: connected ? address : undefined,
		isConnected: connected,
	} as ReturnType<typeof useAccount>);

	return render(
		<MemoryRouter>
			<Header />
		</MemoryRouter>
	);
}

describe('Header — wallet address display', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows "Connect Wallet" link when wallet is not connected', () => {
		renderHeader(false);

		const link = screen.getByRole('link', { name: /connect wallet/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/connect');
	});

	it('does not display any wallet address when unconnected', () => {
		renderHeader(false);

		expect(screen.queryByTestId('wallet-address')).not.toBeInTheDocument();
		expect(screen.queryByTestId('full-address')).not.toBeInTheDocument();
	});

	it('displays truncated address after wallet connects', () => {
		renderHeader(true, KNOWN_ADDRESS);

		const truncated = shortenAddress(KNOWN_ADDRESS);
		const addressEl = screen.getByTestId('wallet-address');
		expect(addressEl).toBeInTheDocument();
		expect(addressEl.textContent).toBe(truncated);

		// Verify the truncation format: first 4 + ellipsis + last 4
		expect(truncated).toBe('0x12…5678');
		expect(truncated).toMatch(/^.{4}….{4}$/);
	});

	it('does not show "Connect Wallet" link when connected', () => {
		renderHeader(true, KNOWN_ADDRESS);

		expect(screen.queryByRole('link', { name: /connect wallet/i })).not.toBeInTheDocument();
	});

	it('shows full address in popover after clicking the truncated display', async () => {
		renderHeader(true, KNOWN_ADDRESS);

		const addressBtn = screen.getByTestId('wallet-address');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await act(async () => {
			fireEvent.click(addressBtn);
		});

		const fullAddress = screen.getByTestId('full-address');
		expect(fullAddress).toBeInTheDocument();
		expect(fullAddress.textContent).toBe(KNOWN_ADDRESS);

		const dialog = screen.getByRole('dialog', { name: /full wallet address/i });
		expect(dialog).toBeInTheDocument();
	});

	it('closes the popover when clicking outside', async () => {
		renderHeader(true, KNOWN_ADDRESS);

		const addressBtn = screen.getByTestId('wallet-address');

		await act(async () => {
			fireEvent.click(addressBtn);
		});
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		await act(async () => {
			fireEvent.mouseDown(document.body);
		});

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
