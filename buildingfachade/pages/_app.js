import "../styles/global.css";

// import Layout from "../components/layout";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}
