// Contoh CSV impor (tombol "Gunakan Contoh" di modal impor) — diproses lewat
// jalur parseCsv → validateRows yang SAMA dengan file asli, supaya preview
// contoh = preview file nyata. Berisi 7 baris: 4 valid (1 bentrok duplikat
// dengan seed mock), 2 tidak valid (tanggal rusak, angka negatif), 1 baris
// dengan 18 kolom (menimbulkan warning "terlalu banyak kolom" — ekstra diabaikan).
export const SAMPLE_CSV = `Date;Model;Shift;UPH Target;UPH Result;HC Standard;HC Actual;Plan;Output Prod;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing
2026-08-13;LV-3000;1;90;92;30;32;960;984;12;8;6;2
2026-08-13;LV-4000;1;80;85;28;29;800;832;10;8;5;2
2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2
2026-08-14;LV-3000;2;90;95;30;30;960;940;12;8;6;2
2026-08-1X;LV-5000;1;100;100;25;25;0;2;8;8;4;2
2026-08-14;LV-6000;1;75;-5;28;30;600;640;15;8;7;2
2026-08-14;LV-7000;1;75;80;28;30;600;640;15;8;7;2;CATATAN;A;B;C;D`;

export const SAMPLE_CSV_FILENAME = "contoh-produksi.csv";