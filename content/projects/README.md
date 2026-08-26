# Project images

このフォルダに `.png` を追加すると、`projects.html` にファイル名順で表示されます。画像をクリックすると、ファイル名に埋め込んだURLへ移動します。

## 推奨画像サイズ

- **推奨: 1600 × 900 px（16:9）**
- 最低目安: 1200 × 675 px
- 1920 × 1080 px でも問題ありません
- PNG推奨

カードの画像枠は16:9です。画像は `object-fit: contain` で表示するため、比率が違う画像でもトリミングせず全体を表示します。その場合は上下または左右に少し余白が入ります。

スマートフォンではカード自体が1列に縮小されるため、16:9の画像ならレイアウトが崩れません。画像内に重要な文字やUIを入れる場合は、1600 × 900 px基準で端から **80〜100px程度** の安全余白を取ることをおすすめします。

## 推奨ファイル名

```text
01__Cherry__https%3A%2F%2Fgithub.com%2FFugu0141%2FCherry-ToDo.png
02__License-Creator__https%3A%2F%2Fgithub.com%2FFugu0141%2FLicense_Creator.png
03__Deep-Learning-Study__https%3A%2F%2Fgithub.com%2FFugu0141%2FDeep_Learning_Study.png
```

形式は `表示順__タイトル__URLをencodeURIComponentした文字列.png` です。

URLだけをファイル名にした `https%3A%2F%2Fexample.com.png` 形式にも対応しています。URLをファイル名へ直接入れる場合、`:` や `/` はファイル名に使いにくいため、URL全体を `encodeURIComponent` してから使ってください。

## ローカルで確認する方法

`projects.html` を直接ダブルクリックして `file://` で開く方法では、ブラウザの安全制限によりフォルダ内のPNG一覧を自動取得できません。

Windowsではリポジトリ直下の `preview-local.ps1` を実行してください。ローカルサーバーが起動し、`http://localhost:8000/projects.html` で確認できます。この方法なら、このフォルダにPNGを追加したあとページを再読み込みするだけで反映されます。GitHubへのPushやmanifest更新は不要です。

GitHub Pages上では、PNGを追加・削除すると GitHub Actions が `assets/content-manifest.json` を更新します。
