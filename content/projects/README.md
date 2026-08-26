# Project images

このフォルダに `.png` を追加すると、`projects.html` にファイル名順で表示されます。画像をクリックすると、ファイル名に埋め込んだURLへ移動します。

## 推奨ファイル名

```text
01__Cherry__https%3A%2F%2Fgithub.com%2FFugu0141%2FCherry-ToDo.png
02__License-Creator__https%3A%2F%2Fgithub.com%2FFugu0141%2FLicense_Creator.png
03__Deep-Learning-Study__https%3A%2F%2Fgithub.com%2FFugu0141%2FDeep_Learning_Study.png
```

形式は `表示順__タイトル__URLをencodeURIComponentした文字列.png` です。

URLだけをファイル名にした `https%3A%2F%2Fexample.com.png` 形式にも対応しています。URLをファイル名へ直接入れる場合、`:` や `/` はファイル名に使いにくいため、URL全体を `encodeURIComponent` してから使ってください。

PNGを追加・削除すると GitHub Actions が `assets/content-manifest.json` を更新します。
