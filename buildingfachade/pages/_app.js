import "../styles/global.css";
import Navigation from "../components/Navigation";
import { OpenCVProvider } from "../contexts/OpenCVContext";

export default function App({ Component, pageProps }) {
  return (
    <OpenCVProvider>
      <Navigation />
      <Component {...pageProps} />
    </OpenCVProvider>
  );
}
