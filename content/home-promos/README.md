# Home promo images

このフォルダに `.png` を追加すると、トップページの「いま作っているもの」に表示されます。

## 推奨ファイル名

```text
01__Cherry__https%3A%2F%2Fgithub.com%2FFugu0141%2FCherry-ToDo.png
02__Deep-Learning-Study__https%3A%2F%2Fgithub.com%2FFugu0141%2FDeep_Learning_Study.png
```

形式は `表示順__タイトル__URLをencodeURIComponentした文字列.png` です。

URLだけをファイル名にした `https%3A%2F%2Fexample.com.png` 形式にも対応しています。

PNGを追加・削除すると GitHub Actions が `assets/content-manifest.json` を更新します。更新前でも、ページ側はGitHub Contents APIから読み込むフォールバックを持っています。
