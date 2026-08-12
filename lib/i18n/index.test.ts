// Test kamus i18n: semua key harus lengkap di 5 bahasa (tidak ada key hilang),
// helper load/save/t aman terhadap input rusak, changelog lengkap per bahasa.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHANGELOG,
  DEFAULT_LANG,
  DICT,
  LANGS,
  LANG_STORAGE_KEY,
  loadLang,
  saveLang,
  t,
  isLang,
} from "./index";

const ALL_LANGS = LANGS.map((l) => l.code);

describe("kamus i18n", () => {
  it("semua bahasa punya key lengkap (set key identik dengan 'id')", () => {
    const base = new Set(Object.keys(DICT.id));
    assert.ok(base.size > 0, "kamus id tidak boleh kosong");
    for (const lang of ALL_LANGS) {
      const keys = Object.keys(DICT[lang]);
      assert.equal(keys.length, base.size, `jumlah key ${lang} tidak sama dengan id`);
      for (const k of base) {
        assert.ok(k in DICT[lang], `key '${k}' hilang di bahasa '${lang}'`);
      }
    }
  });

  it("t() mengembalikan string dari bahasa yang diminta", () => {
    assert.equal(t("id", "app.title"), DICT.id["app.title"]);
    assert.equal(t("ja", "sec.save"), DICT.ja["sec.save"]);
    assert.equal(t("zh", "tab.about"), DICT.zh["tab.about"]);
  });

  it("DICT tidak boleh ada value kosong", () => {
    for (const lang of ALL_LANGS) {
      for (const [key, value] of Object.entries(DICT[lang])) {
        assert.ok(typeof value === "string" && value.trim().length > 0, `${lang}.${key} kosong`);
      }
    }
  });
});

describe("helper bahasa", () => {
  it("isLang menolak nilai invalid", () => {
    assert.ok(isLang("en"));
    assert.ok(!isLang("fr"));
    assert.ok(!isLang(null));
    assert.ok(!isLang(42));
  });

  it("loadLang: storage null/kosong/rusak → DEFAULT_LANG", () => {
    assert.equal(loadLang(null), DEFAULT_LANG);
    assert.equal(loadLang({ getItem: () => null }), DEFAULT_LANG);
    assert.equal(loadLang({ getItem: () => "fr" }), DEFAULT_LANG);
    assert.equal(loadLang({ getItem: () => "not json" }), DEFAULT_LANG);
  });

  it("loadLang: nilai valid dibaca, saveLang menulis ke storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    assert.equal(loadLang(storage), DEFAULT_LANG);
    saveLang("ko", storage);
    assert.equal(store.get(LANG_STORAGE_KEY), "ko");
    assert.equal(loadLang(storage), "ko");
  });
});

describe("changelog", () => {
  it("setiap rilis punya fitur lengkap untuk 5 bahasa dengan jumlah sama", () => {
    assert.ok(CHANGELOG.length >= 1, "changelog tidak boleh kosong");
    for (const entry of CHANGELOG) {
      assert.ok(entry.version.startsWith("v"), `versi '${entry.version}' harus berawalan v`);
      assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `tanggal '${entry.date}' bukan ISO date`);
      const counts = ALL_LANGS.map((lang) => entry.features[lang].length);
      for (const count of counts) {
        assert.equal(count, counts[0], `fitur ${entry.version} tidak sama banyak antar bahasa`);
      }
      assert.ok(counts[0] >= 1, `rilis ${entry.version} minimal 1 fitur`);
    }
  });

  it("versi diurutkan menurun (terbaru dulu)", () => {
    const versions = CHANGELOG.map((e) => e.version);
    const sorted = [...versions].sort().reverse();
    assert.deepEqual(versions, sorted);
  });
});
