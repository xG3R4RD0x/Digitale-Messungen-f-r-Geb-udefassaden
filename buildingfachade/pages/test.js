import React from "react";

const Test = () => {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>Bienvenido a la Página de Prueba</h1>
      <p>
        Esta es una página de aterrizaje de prueba para el proyecto de
        mediciones digitales de fachadas de edificios.
      </p>
      <button
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#007BFF",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={() => alert("¡Botón de prueba clicado!")}
      >
        Clic Aquí
      </button>
    </div>
  );
};

export default Test;
