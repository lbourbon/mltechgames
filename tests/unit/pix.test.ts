import { expect, test } from "vitest";
import { PIX_COPIA_E_COLA } from "../../src/lib/site";

// CRC16-CCITT do padrão EMV usado pelo PIX: um código digitado errado é recusado pelo banco.
function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

test("o código PIX tem formato e dígito verificador válidos", () => {
  expect(PIX_COPIA_E_COLA).toMatch(/^000201/);
  expect(PIX_COPIA_E_COLA).toContain("br.gov.bcb.pix");
  expect(crc16(PIX_COPIA_E_COLA.slice(0, -4))).toBe(PIX_COPIA_E_COLA.slice(-4));
});
