/*
  Stamp Rally Template configuration
  Edit this file to customize the stamp rally without touching HTML/CSS.
*/
window.STAMP_RALLY_CONFIG = {
  appName: "Generic Stamp Rally",
  logoText: "STAMP RALLY",
  storageKey: "generic_stamp_rally_v1",

  // Main theme colors. CSS variables are generated from these values.
  theme: {
    primary: "#0284c7",
    secondary: "#7c3aed",
    success: "#16a34a",
    background: "#f0f4f8",
    text: "#0f172a",
    muted: "#64748b"
  },

  // Default sample: 5 stamps.
  // You can add/remove stamps. The app automatically follows this list.
  stamps: [
    { id: "1", icon: "🌟", title: "Stamp 1", message: "最初のスタンプをゲットしました！" },
    { id: "2", icon: "🎈", title: "Stamp 2", message: "いい調子です。そのまま集めていきましょう！" },
    { id: "3", icon: "🧭", title: "Stamp 3", message: "半分を超えました。ゴールが見えてきました！" },
    { id: "4", icon: "🎁", title: "Stamp 4", message: "あと少しです。最後のQRコードを探しましょう！" },
    { id: "5", icon: "🏆", title: "Stamp 5", message: "すべてのスタンプを集めました！" }
  ],

  pages: {
    home: "index.html",
    stampBook: "stamp.html",
    stampGet: "stamp-get.html",
    goal: "goal.html"
  },

  text: {
    homeTitle: "スタンプラリー",
    homeLead: "QRコードを読み取ってスタンプを集めましょう。すべて集めるとコンプリートページが表示されます。",
    startButton: "スタンプ帳を開く",
    sampleLinksTitle: "テスト用リンク",
    sampleLinksDescription: "公開前の動作確認用です。実際のイベントでは、各リンクをQRコードにしてください。",

    stampBookTitle: "スタンプ帳",
    stampBookLead: "会場のQRコードを読み取ってスタンプを集めよう！",
    currentCountLabel: "現在のスタンプ数",
    emptyMessage: "まだスタンプがありません。<br>QRコードを探してみよう！",
    progressMessages: [
      "まだスタンプがありません。<br>QRコードを探してみよう！",
      "いいスタートです。まだまだ集めましょう！",
      "いい調子です。どんどん進めましょう！",
      "半分を超えました。ゴールまであと少し！",
      "ラスト1個です。最後まで頑張りましょう！",
      "🎊 全部集めました。コンプリートページへ進めます！"
    ],
    collectionTitle: "// STAMP COLLECTION",
    statusEmoji: "🗺️",
    statusText: "QRコードを読み取ると、ここにスタンプが追加されます。",
    completeStatusEmoji: "🎊",
    completeStatusText: "<strong>全部集めました！おめでとうございます！</strong><br>コンプリートページを表示できます。",
    homeButton: "ホームへ",
    goalButton: "コンプリートページへ",

    getBadgePrefix: "// STAMP",
    stampGetTitle: "STAMP GET!",
    alreadyCollected: "✅ このスタンプはすでに取得済みです",
    invalidStampTitle: "INVALID STAMP",
    invalidStampMessage: "このQRコードは、このスタンプラリーでは使えないようです。",
    progressLabel: "スタンプ進捗",
    viewStampBookButton: "スタンプ帳を見る",
    autoRedirectMessage: "すべて集めたので、まもなくコンプリートページへ移動します。",

    goalTitle: "COMPLETE!",
    goalLead: "すべてのスタンプを集めました。おめでとうございます！",
    prizeTitle: "PRIZE / 景品",
    prizeContent: "受付でこの画面を見せてください",
    prizeNote: "イベント期間中のみ有効です",
    incompleteTitle: "まだコンプリートしていません",
    incompleteMessage: "すべてのスタンプを集めると、このページを表示できます。",
    backToStampBookButton: "スタンプ帳に戻る",

    resetButton: "進捗をリセット",
    resetConfirm: "スタンプの進捗をリセットしますか？"
  }
};
