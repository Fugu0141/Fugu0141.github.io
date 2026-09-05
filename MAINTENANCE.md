# 自己紹介サイトの編集ガイド

このファイルは、自己紹介サイトを手修正するときに「どのファイルを触ればよいか」を迷わないための案内です。

> `stamp-rally/` は別プロジェクトとして扱い、このガイドの対象外です。

## まず見る場所

| 変更したいもの | 主に編集するファイル |
| --- | --- |
| トップページ・Projects・Linksの共通デザイン | `assets/portfolio.css` |
| ヘッダー、フッター、モバイルメニュー | `assets/portfolio.js` / `assets/portfolio.css` |
| 日本語 / English のURL切替・共通言語UI | `assets/localization.js` / `assets/language.css` |
| トップページのContribution表示 | `assets/portfolio.js` / `assets/portfolio.css` |
| トップ・Projectsの画像一覧 | `assets/portfolio.js` / `content/` |
| 「大切にしていること」ページ | `assets/principles.css` / `principles.html` / `en/principles.html` |
| Activityページ | `assets/activity.css` / `assets/activity-page.js` / `assets/activity-art.js` |
| 404ページ | `assets/404.css` / `assets/404.js` / `404.html` |
| 制作物の画像・リンク | `content/home-promos/` / `content/projects/` |

## 言語URLとOGP

日本語は従来どおりサイト直下、英語は `/en/` 配下に置きます。URL自体を言語の判定元にすることで、JavaScriptを実行しないSNSクローラーにも正しい言語のOGPを返せます。

| ページ | 日本語 | English |
| --- | --- | --- |
| Home | `/` | `/en/` |
| Projects | `/projects.html` | `/en/projects.html` |
| Principles | `/principles.html` | `/en/principles.html` |
| Links | `/links.html` | `/en/links.html` |
| Activity | `/activity.html` | `/en/activity.html` |

各言語ページの `<head>` には、次を静的に記述します。

- `canonical`
- `hreflang="ja"` / `hreflang="en"` / `hreflang="x-default"`
- 言語ごとの `title` / `description`
- 言語ごとの `og:title` / `og:description` / `og:url` / `og:locale`
- Twitter Cardのタイトル・説明

`assets/localization.js` は共通ヘッダーのナビゲーション、サポート項目、言語選択UIを現在の `html[lang]` に合わせます。OGPはクローラー対応のためJavaScriptでは変更しません。

英語ページには `<base href="/">` を置き、共通CSS・JS・画像・自動生成コンテンツを日本語ページと同じルート資産から参照します。これにより `/en/` 用に `assets/` や `content/` を複製しません。

## ファイルの役割

### `assets/portfolio.css`

`index.html`、`projects.html`、`links.html`、および共通ヘッダー・フッターの基本デザインを管理します。

CSSはファイル内で次の順に分けています。

1. TOKENS / BASE
2. HEADER
3. HOME HERO
4. SECTIONS
5. CONTRIBUTIONS
6. IMAGE GALLERY
7. INNER PAGE HERO
8. LINKS
9. FOOTER
10. RESPONSIVE

以前のような `*-refine.css` による後付け上書きは行いません。

### `assets/localization.js` / `assets/language.css`

言語URLと共通の言語選択UIだけを担当します。ページ本文の翻訳は各言語のHTMLに静的に置きます。これにより、OGPと本文の言語がURLごとに一致します。

### `assets/portfolio.js`

自己紹介サイトの共通動作を管理します。

- ヘッダー・フッター生成
- スマホメニュー
- GitHub Contribution表示
- 制作物画像の読み込み

同じ処理を別の `refine` / `fallback` スクリプトから書き換えない方針です。

### `assets/principles.css`

`principles.html` と `en/principles.html` 専用です。言語ごとに別CSSを作らず、同じカードレイアウトを共有します。

### Activity

Activityは世界地図描画が特殊なため、自己紹介サイト本体とは意図的に分離しています。

- `assets/activity.css`: Activityの見た目
- `assets/activity-page.js`: ヘッダー・URLベースの言語切替・背景演出
- `assets/activity-art.js`: 365個の光と世界地図の描画

### 404

- `404.html`: HTML構造
- `assets/404.css`: 見た目
- `assets/404.js`: ランダムキャラクター選択

HTML内に大きなCSSやJavaScriptを直書きしない方針です。

## 制作物画像の追加

画像は次のフォルダへ追加します。

- トップページ: `content/home-promos/`
- Projects: `content/projects/`

ファイル名は以下の形式に対応しています。

```text
URL.png
01__URL.png
01__表示名__URL.png
```

URL部分はURLエンコードしても構いません。

GitHub上では `.github/workflows/update-portfolio-content.yml` が `assets/content-manifest.json` を自動生成します。生成処理本体は `scripts/build-content-manifest.js` にあります。

## 自動生成ファイル

次のファイルは原則として手修正しません。

- `assets/content-manifest.json`
- `assets/contributions.json`

それぞれGitHub Actionsから更新されます。

## ローカル確認

Windowsでは次のどちらかを利用できます。

- `preview-local.ps1`
- `preview-local.bat`

どちらもリポジトリ直下をPythonのHTTPサーバーで配信します。

`file://` でHTMLを直接開くと、ブラウザの制限により `content/` 配下の画像一覧を取得できません。

## 今後のルール

不具合修正やデザイン変更の際は、次を基本方針にします。

- `*-refine.css` / `*-refine.js` のような後付け修正ファイルを増やさない
- 同じDOMを複数のJavaScriptから競合して書き換えない
- 同じ描画ロジックを `fallback` 用にコピーしない
- ページ固有のCSSは、そのページ専用ファイルに置く
- 日本語ページを変更した場合、対応する `/en/` ページも同時に確認する
- OGPはJavaScript切替にせず、言語URLごとのHTMLへ静的に置く
- 自動生成処理はGitHub Actions YAMLへ長く直書きせず、可能なら `scripts/` に置く
- 使われなくなった旧コード・旧ブランチ参照は残さない

「一時的に上書きして直す」のではなく、最終的な正しい定義を本来の担当ファイルへ反映するようにしてください。
