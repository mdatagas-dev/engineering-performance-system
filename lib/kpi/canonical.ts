// Formula kanonik KPI standar — sumber kebenaran untuk tampilan (tooltip/UI),
// 1:1 dengan PRD & Excel. Hanya untuk display, bukan validasi keras: admin
// tetap boleh menyesuaikan deskripsi formula di KpiConfig.
// uph & hc tidak dicantumkan — KPI dasar (input engine), bukan formula gap.
export const FORMULA_CANONICAL: Readonly<Record<string, string>> = {
  gap_uph: "GAP UPH = UPH Result − UPH Target",
  gap_hc: "GAP HC = HC Actual − HC Standard",
  gap_op: "GAP OP = Output Prod − Plan",
  upph: "UPPH = UPH Result ÷ HC Actual",
};
