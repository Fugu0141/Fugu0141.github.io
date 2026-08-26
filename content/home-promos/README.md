# Home promo images

このフォルダに `.png` を追加すると、トップページの「いま作っているもの」に表示されます。

## 推奨画像サイズ

- **推奨: 1600 × 900 px（16:9）**
- 最低目安: 1200 × 675 px
- 1920 × 1080 px でも問題ありません
- PNG推奨

表示枠は16:9です。16:9以外の画像も表示できますが、余白が入る場合があります。画像は `object-fit: contain` で表示するため、PC・タブレット・スマートフォンでも画像そのものが切れないようにしています。

UIの文字やボタンを画像内に入れる場合は、端から **80〜100px程度** 内側へ配置すると、小さい画面でも見やすくなります。

## 推奨ファイル名

```text
01__Cherry__https%3A%2F%2Fgithub.com%2FFugu0141%2FCherry-ToDo.png
02__Deep-Learning-Study__https%3A%2F%2Fgithub.com%2FFugu0141%2FDeep_Learning_Study.png
```

形式は `表示順__タイトル__URLをencodeURIComponentした文字列.png` です。

URLだけをファイル名にした `https%3A%2F%2Fexample.com.png` 形式にも対応しています。

## ローカルで確認する方法

`index.html` を直接ダブルクリックして `file://` で開く方法では、ブラウザの安全制限によりフォルダ内のPNG一覧を自動取得できません。

Windowsではリポジトリ直下の **`preview-local.bat` をダブルクリック**してください（PowerShellを使う場合は `preview-local.ps1` でも可）。ローカルサーバーが起動し、`http://localhost:8000/` で確認できます。この方法なら、このフォルダにPNGを追加したあとページを再読み込みするだけで表示されます。GitHubへのPushやmanifest更新は不要です。

GitHub Pages上では、PNGを追加・削除すると GitHub Actions が `assets/content-manifest.json` を更新します。manifest更新前でも、ページ側はGitHub Contents APIから読み込むフォールバックを持っています。
