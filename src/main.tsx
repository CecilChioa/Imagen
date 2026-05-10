import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./App";
import "./i18n";
import "@mantine/core/styles.css";
import "./styles.css";

const theme = createTheme({
  primaryColor: "indigo",
  fontFamily: "Inter, Microsoft YaHei, system-ui, sans-serif",
  defaultRadius: "md",
  colors: {
    dark: [
      "#f4f4f6",
      "#d8dae3",
      "#b8bac7",
      "#8f93a3",
      "#666b7c",
      "#3f4350",
      "#2b2f3a",
      "#20242d",
      "#171a22",
      "#0f1218",
    ],
  },
  components: {
    Button: { defaultProps: { size: "sm" } },
    TextInput: { defaultProps: { size: "sm" } },
    Select: { defaultProps: { size: "sm" } },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);