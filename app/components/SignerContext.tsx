import { Badge } from '@/components/ui';
import { shortAddress } from '@/lib/wallet';

export function SignerContext({ account, requiredSigner, requiredLabel, authorized, role, network, contract }: {
  account: string | null;
  requiredSigner?: string;
  requiredLabel?: string;
  authorized?: boolean;
  role: string;
  network: string;
  contract: string;
}) {
  const restricted = Boolean(requiredSigner || requiredLabel);
  const matches = Boolean(account && (authorized ?? (!requiredSigner || account.toLowerCase() === requiredSigner.toLowerCase())));
  return (
    <div className="signer-context" data-match={account ? matches ? 'yes' : 'no' : 'unknown'}>
      <div className="signer-context-head"><strong>{role}</strong><Badge tone={!account ? 'neutral' : matches ? 'live' : 'shortfall'}>{!account ? 'Wallet not connected' : matches ? 'Signer matches' : 'Wrong signer'}</Badge></div>
      <dl>
        <div><dt>Connected</dt><dd>{account ? shortAddress(account) : 'None'}</dd></div>
        <div><dt>Required</dt><dd>{requiredLabel ?? (restricted ? shortAddress(requiredSigner as string) : 'Any caller')}</dd></div>
        <div><dt>Network</dt><dd>{network}</dd></div>
        <div><dt>Contract</dt><dd>{shortAddress(contract)}</dd></div>
      </dl>
    </div>
  );
}
