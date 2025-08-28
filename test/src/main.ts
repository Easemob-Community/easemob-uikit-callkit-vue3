import { createApp } from "vue";
import App from "./App.vue";

// 引入插件
import EasemobChatCallKit from "easemob-chat-callkit-vue3";

const app = createApp(App);

// 使用插件
app.use(EasemobChatCallKit, {
  appKey: "test-app-key",
  userId: "test-user",
  accessToken: "test-token",
  debug: true,
});

app.mount("#app");
