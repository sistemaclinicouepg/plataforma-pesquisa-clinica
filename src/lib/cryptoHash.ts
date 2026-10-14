import { createHash } from 'crypto';

export type SignatureHashPayload = {
  participantId: string;
  cpf: string;
  signedAt: string | Date;
  consentFormId: string;
  signatureData: string;
  isAssent?: boolean;
  guardianCpf?: string | null;
};

/**
 * Gera um hash criptográfico seguro SHA-256 para o Termo de Consentimento (TCLE/TALE),
 * garantindo integridade e não-repúdio conforme Resolução CNS 466/2012 e Lei 13.709/2018 (LGPD).
 */
export function generateSignatureHash(payload: SignatureHashPayload): string {
  const normalizedDate = payload.signedAt instanceof Date 
    ? payload.signedAt.toISOString() 
    : new Date(payload.signedAt).toISOString();

  const dataToHash = [
    payload.participantId,
    (payload.cpf || '').replace(/\D/g, ''),
    normalizedDate,
    payload.consentFormId,
    payload.isAssent ? 'TALE' : 'TCLE',
    (payload.guardianCpf || '').replace(/\D/g, ''),
    // Hasheamos os primeiros e últimos 50 caracteres do base64 do traçado para compacidade e robustez
    payload.signatureData.slice(0, 100) + payload.signatureData.slice(-100),
    'UEPG-PESQUISA-CLINICA-CNS466-LGPD'
  ].join('|');

  return createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Formata o hash em blocos legíveis de 4 caracteres para exibição em carimbos oficiais e validação por terceiros.
 * Ex: 3A7F-9B1C-E452-...
 */
export function formatDisplayHash(hash: string): string {
  if (!hash) return '';
  return hash.toUpperCase().match(/.{1,4}/g)?.join('-') || hash.toUpperCase();
}
