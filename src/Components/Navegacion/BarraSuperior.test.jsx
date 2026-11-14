import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import BarraSuperior from "./BarraSuperior.jsx";import { montar } from "./pruebas.utils.jsx";

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

  it("fuera de una sección conocida el botón dice «Menú»", () => {
    montar(<BarraSuperior onAbrirMenu={() => {}} />, { ruta: "/otra-cosa" });
    expect(barra().querySelector("[data-seccion-actual]").textContent).toBe("Menú");
  });
});
