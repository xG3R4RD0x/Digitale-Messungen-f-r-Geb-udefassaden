import "../styles/global.css";

import { OpenCVProvider } from "../contexts/OpenCVContext";

export default function App({ Component, pageProps }) {
  return (
    <OpenCVProvider>
      <Component {...pageProps} />
    </OpenCVProvider>
  );
}
