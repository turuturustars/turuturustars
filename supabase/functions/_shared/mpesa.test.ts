import {
  createTimestamp,
  normalizeKenyanPhone,
  normalizeReceipt,
  parseDarajaTimestamp,
} from "./mpesa.ts";

Deno.test("normalizeKenyanPhone handles local format", () => {
  const value = normalizeKenyanPhone("0712345678");
  if (value !== "254712345678") {
    throw new Error(`expected 254712345678, received ${value}`);
  }
});

Deno.test("normalizeReceipt uppercases and trims", () => {
  const value = normalizeReceipt("  qwe 123  ");
  if (value !== "QWE123") {
    throw new Error(`expected QWE123, received ${value}`);
  }
});

Deno.test("createTimestamp returns 14 digits", () => {
  const value = createTimestamp(new Date("2026-02-11T10:11:12Z"));
  if (!/^\d{14}$/.test(value)) {
    throw new Error(`expected 14 digits, received ${value}`);
  }
});

Deno.test("parseDarajaTimestamp parses ISO string", () => {
  const value = parseDarajaTimestamp("20260211101112");
  if (!value?.startsWith("2026-02-11T10:11:12")) {
    throw new Error(`unexpected parsed timestamp ${value}`);
  }
});
