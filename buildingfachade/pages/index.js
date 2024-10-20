// pages/index.js
import UploadComponent from "../components/UploadComponent";

import React from "react";

const Home = () => {
  return (
    <div>
      <h1>Bienvenido a mi proyecto Next.js</h1>
      <p>Esta es la página de inicio.</p>
      <UploadComponent onUpload={(data) => console.log(data)} />
    </div>
  );
};

export default Home;
