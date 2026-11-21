import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import BarraSuperior from "./BarraSuperior.jsx";
import { montar } from "./pruebas.utils.jsx";
import { usePonerAvisoEnBarra } from "./avisoBarraSuperior.js";

const barra = () => document.querySelector("[data-barra-superior]");

describe("BarraSuperior", () => {
  it("lleva el botón de menú, que avisa al pulsarlo", () => {
    const alAbrir = vi.fn();
    montar(<BarraSuperior menuAbierto={false} onAbrirMenu={alAbrir} />);
    const boton = screen.getByRole("button", { name: "Abrir el menú" });
    expect(boton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(boton);

    expect(alAbrir).toHaveBeenCalledTimes(1);
  });

  it("refleja en aria-expanded que el menú está abierto", () => {
    montar(<BarraSuperior menuAbierto onAbrirMenu={() => {}} />);
    expect(screen.getByRole("button", { name: "Abrir el menú" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("dice en qué sección se está, también dentro de una canción", () => {
    montar(<BarraSuperior onAbrirMenu={() => {}} />, { ruta: "/ViewCancion/abc" });
    expect(barra().querySelector("[data-seccion-actual]").textContent).toBe("Canciones");
  });

  it("el nombre de la sección es parte del propio botón de menú: no hay un botón aparte", () => {
    const alAbrir = vi.fn();
    montar(<BarraSuperior onAbrirMenu={alAbrir} />, { ruta: "/ViewImagenes" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    const boton = screen.getByRole("button", { name: "Abrir el menú" });
    expect(boton.querySelector("[data-seccion-actual]").textContent).toBe("Imágenes");
    // Ícono de la sección y flechita ▾ dentro del mismo botón.
    expect(boton.querySelectorAll("svg")).toHaveLength(2);

    fireEvent.click(boton.querySelector("[data-seccion-actual]"));

    expect(alAbrir).toHaveBeenCalledTimes(1);
  });

  it("a la derecha lleva el estado del servicio y el de la pantalla del templo", () => {
    montar(<BarraSuperior onAbrirMenu={() => {}} />, { app: { pantallaTemplo: "encendida" } });
    const turno = barra().querySelector("[data-turno-barra]");
    expect(turno.textContent.length).toBeGreaterThan(0);
    expect(["puedo", "no-puedo"]).toContain(turno.getAttribute("data-turno-barra"));
    const pantalla = barra().querySelector("[data-icono]");
    expect(pantalla.getAttribute("data-icono")).toBe("encendida");
    // Repartidos en el ancho: el culto ocupa el espacio y va centrado; la pantalla, a la derecha.
    expect(turno.className).toContain("flex-1");
    expect(turno.className).toContain("justify-center");
    expect(turno.parentElement.className).toContain("flex-1");
    expect(turno.parentElement.lastElementChild).toBe(barra().querySelector("[data-sin-chip]"));
    // Sin recuadro y fuera del botón de menú.
    expect(barra().querySelector("[data-sin-chip]")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir el menú" }).contains(turno)).toBe(false);
  });

  // Una vista puede poner un texto en la barra en lugar del estado del servicio y de la pantalla
  // (20-11-2026: las Pruebas de Prédica dicen «Modo de prueba»).
  describe("con un aviso puesto por la vista", () => {
    // Una vista de mentira que pone el aviso mientras está montada
    const Vista = ({ texto }) => {
      usePonerAvisoEnBarra(texto);
      return null;
    };
    const conVista = (texto) =>
      montar(
        <>
          <BarraSuperior onAbrirMenu={() => {}} />
          <Vista texto={texto} />
        </>,
        { app: { pantallaTemplo: "encendida" } }
      );

    it("sustituye el estado del servicio y el de la pantalla por el texto, y el botón de menú se queda", () => {
      conVista("Modo de prueba");
      const aviso = barra().querySelector("[data-aviso-barra]");
      expect(aviso.textContent).toBe("Modo de prueba");
      expect(aviso.className).toContain("flex-1");
      expect(aviso.className).toContain("justify-center");
      expect(aviso.querySelector("svg")).not.toBeNull();
      // Sin el estado del servicio ni el de la pantalla
      expect(barra().querySelector("[data-turno-barra]")).toBeNull();
      expect(barra().querySelector("[data-icono]")).toBeNull();
      expect(barra().querySelector("[data-sin-chip]")).toBeNull();
      // El botón de menú sigue ahí, y el aviso fuera de él
      const menu = screen.getByRole("button", { name: "Abrir el menú" });
      expect(menu.contains(aviso)).toBe(false);
      // Lo que significa, en el título
      expect(aviso.getAttribute("title")).toContain("no se proyecta nada");
    });

    it("sin aviso, la barra es la de siempre", () => {
      conVista(null);
      expect(barra().querySelector("[data-aviso-barra]")).toBeNull();
      expect(barra().querySelector("[data-turno-barra]")).not.toBeNull();
      expect(barra().querySelector("[data-icono]")).not.toBeNull();
    });

    it("al quitarse la vista, la barra vuelve a mostrar el estado del servicio y de la pantalla", () => {
      const { unmount } = conVista("Modo de prueba");
      expect(barra().querySelector("[data-aviso-barra]")).not.toBeNull();
      // Se desmonta toda la prueba: la limpieza de la vista quita el aviso
      unmount();
      montar(<BarraSuperior onAbrirMenu={() => {}} />, { app: { pantallaTemplo: "encendida" } });
      expect(barra().querySelector("[data-aviso-barra]")).toBeNull();
      expect(barra().querySelector("[data-turno-barra]")).not.toBeNull();
    });

    it("cambia con el texto de la vista y vuelve al estado de siempre si pasa a null", () => {
      // Una vista que, al pulsar su botón, quita el aviso
      const Quitable = () => {
        const [texto, setTexto] = useState("Modo de prueba");
        return (
          <>
            <BarraSuperior onAbrirMenu={() => {}} />
            <Vista texto={texto} />
            <button type="button" data-quitar-aviso onClick={() => setTexto(null)}>
              quitar
            </button>
          </>
        );
      };
      montar(<Quitable />, { app: { pantallaTemplo: "encendida" } });
      expect(barra().querySelector("[data-aviso-barra]").textContent).toBe("Modo de prueba");
      fireEvent.click(document.querySelector("[data-quitar-aviso]"));
      expect(barra().querySelector("[data-aviso-barra]")).toBeNull();
      expect(barra().querySelector("[data-turno-barra]")).not.toBeNull();
    });
  });

  it("fuera de una sección conocida el botón dice «Menú»", () => {
    montar(<BarraSuperior onAbrirMenu={() => {}} />, { ruta: "/otra-cosa" });
    expect(barra().querySelector("[data-seccion-actual]").textContent).toBe("Menú");
  });
});
