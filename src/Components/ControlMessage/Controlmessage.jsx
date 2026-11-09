import { useState, useRef, useEffect } from "react";
import { ref, set, update } from "firebase/database";
import { database } from "../Firebase/Firebase";
import { setDoc, deleteDoc } from "firebase/firestore";
import { docIglesia, MESSAGES } from "../Firebase/RutasIglesia";
import {
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  TagIcon,
  TvIcon,
} from "@heroicons/react/24/solid";
import EmojiButton from "../EmojiButton/EmojiButton";
import { useAppContext } from "../Context/AppContext";
import { useAuth } from "../../Components/Context/AuthContext";
import ModalVisibilidad from "../ModalVisibilidad/ModalVisibilidad.jsx";
import FavoritosTexto from "../Favoritos/FavoritosTexto.jsx";
import FranjaTurno from "../Cronograma/FranjaTurno.jsx";
import { useTurno } from "../Hooks/useTurno.js";
import BotonSalida from "../Navegacion/BotonSalida.jsx";

// Cuántos mensajes caben en favoritos. Los documentos son message1..message6.
const TOPE_FAVORITOS = 6;

export default function ControlMenssage() {
  const { userData } = useAuth();
  // Solo quien tiene el turno del cronograma (o un pastor) envía a la pantalla.
  // Escribir y guardar favoritos sí se puede siempre.
  const { exigirTurno } = useTurno();
  const [message, setMessage] = useState("");
  // Cuál de los favoritos está en la pantalla del templo
  const [numProyectado, setNumProyectado] = useState(null);
  // Si se está corrigiendo un favorito, su número: al guardar se escribe encima
  // en vez de ocupar otro sitio
  const [numEditando, setNumEditando] = useState(null);
  const {
    messageItems,
    visibleTicker,
    setVisibleTicker,
    visibleTitulo,
    setVisibleTitulo,
    visibleTexto,
    setVisibleTexto,
    isDesktop,
    showNotif,
    confirmAction,
  } = useAppContext();
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  // proyecta un mensaje de la bd o del imput
  const handleMessage = (item) => {
    const textToSend = item?.text || message;

    if (!textToSend.trim()) return;
    if (!exigirTurno()) return;

    set(ref(database, `displayMessage/${userData.groupId}`), {
      text: textToSend,
      display: "mensaje",
      timestamp: item?.timestamp || Date.now(),
    });

    // Solo un favorito puede quedar marcado como el que está en pantalla
    setNumProyectado(item?.num ?? null);
  };

  // Visibilidad del titulo
  const toggleVisibleTitulo = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTitulo;
    setVisibleTitulo(nuevoEstado);

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del texto
  const toggleVisibleTexto = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTexto;
    setVisibleTexto(nuevoEstado);

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad del ticker
  const toggleVisibleTicker = () => {
    if (!exigirTurno()) return;
    const nuevoEstado = !visibleTicker;
    setVisibleTicker(nuevoEstado);

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: nuevoEstado,
      timestamp: Date.now(),
    });
  };

  // Visibilidad solo texto
  const setAllVisible = () => {
    if (!exigirTurno()) return;
    setVisibleTexto(true);
    setVisibleTitulo(false);
    setVisibleTicker(false);
    const timestamp = Date.now();

    update(ref(database, `displayVisibleTexto/${userData.groupId}`), {
      visibleTexto: true,
      timestamp,
    });

    update(ref(database, `displayVisibleTitulo/${userData.groupId}`), {
      visibleTitulo: false,
      timestamp,
    });

    set(ref(database, `displayVisibleTicker/${userData.groupId}`), {
      visibleTicker: false,
      timestamp,
    });
  };

  // A qué documento va lo que se está guardando: el que se corrige, el primer
  // hueco libre o, si ya están los seis, el más antiguo.
  const numeroDestino = () => {
    if (numEditando) return { num: numEditando, reemplaza: false };

    const usados = messageItems.map((item) => item.num);
    for (let num = 1; num <= TOPE_FAVORITOS; num++) {
      if (!usados.includes(num)) return { num, reemplaza: false };
    }

    const masAntiguo = [...messageItems].sort(
      (a, b) => a.timestamp - b.timestamp
    )[0];
    return { num: masAntiguo.num, reemplaza: true };
  };

  // Guarda el mensaje en favoritos: es el botón que antes decía "Guardar"
  const guardarFavorito = async () => {
    if (message.trim() === "") return;

    try {
      const { num, reemplaza } = numeroDestino();

      await setDoc(docIglesia(userData.groupId, MESSAGES, `message${num}`), {
        text: message,
        timestamp: Date.now(),
        num,
      });

      if (numEditando) {
        showNotif("success", `Mensaje ${num} corregido`);
      } else if (reemplaza) {
        showNotif("info", `Se reemplazó el mensaje ${num} por uno nuevo`);
      } else {
        showNotif("success", `Mensaje ${num} guardado en favoritos`);
      }

      setMessage("");
      setNumEditando(null);
    } catch (error) {
      console.error("Error al agregar el mensaje:", error);
      showNotif("error", "Error al guardar el mensaje");
    }
  };

  // Lleva el texto del favorito al recuadro de escritura para corregirlo
  const editarFavorito = (item) => {
    setMessage(item.text);
    setNumEditando(item.num);
    textareaRef.current?.focus();
    showNotif("info", `Editando el mensaje ${item.num}`);
  };

  const eliminarFavorito = async (item) => {
    const accepted = await confirmAction(
      `¿Eliminar el mensaje ${item.num} de favoritos?`
    );
    if (!accepted) return;

    try {
      await deleteDoc(
        docIglesia(userData.groupId, MESSAGES, `message${item.num}`)
      );

      if (numEditando === item.num) setNumEditando(null);
      if (numProyectado === item.num) setNumProyectado(null);

      showNotif("success", "Mensaje eliminado");
    } catch (error) {
      console.error("Error al eliminar el mensaje:", error);
      showNotif("error", "No se pudo eliminar el mensaje");
    }
  };

  return (
    <div className="min-h-dvh bg-linear-to-b from-app-dark/50 to-app-light/50">
      <div className="sticky top-0 border-b border-app-main bg-app-light z-10 ">
        <FranjaTurno />
        <h1 className="font-bold text-app-main flex items-center gap-1 px-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 shrink-0" />
          <span>Mensajes</span>
          {numEditando && (
            <span className="text-xs font-normal text-app-muted">
              · corrigiendo el mensaje {numEditando}
            </span>
          )}
        </h1>

        <div className="grid grid-cols-12">
          {/*textarea de mensaje*/}
          <div className="col-span-9 flex flex-col p-2 md:p-2">
            <textarea
              ref={textareaRef}
              className="w-full border text-app-muted border-app-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-app-main scrollbar-custom text-sm md:text-base wrap-break-words min-h-16 p-1"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              maxLength={600}
            />
            <p className="col-span-12 flex text-sm text-app-muted justify-end px-3">
              {message.length} / 600
            </p>
          </div>

          {/* emoji y estrella de favoritos */}
          <div className="col-span-3 flex flex-col sm:flex-row items-center justify-center gap-2 p-2">
            <div className=" flex items-center justify-center">
              <EmojiButton
                onSelect={(emoji) => setMessage((prev) => prev + emoji)}
              />
            </div>

            <button
              type="button"
              onClick={guardarFavorito}
              title={
                numEditando
                  ? `Guardar la corrección del mensaje ${numEditando}`
                  : "Agregar a favoritos"
              }
              className={`p-1 rounded-full transition ${
                !message
                  ? "text-app-border cursor-not-allowed"
                  : "text-app-main hover:bg-app-border cursor-pointer"
              }`}
              disabled={!message}
            >
              <StarIcon className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* botones de acciones*/}
        <div className="grid grid-cols-12">
          <div className="w-full flex justify-center col-span-12 gap-2 p-2">
            <button
              type="button"
              onClick={() => {
                handleMessage(), setMessage("");
              }}
              className={`w-full py-1.5 flex items-center justify-center text-center rounded text-xs sm:text-sm md:text-base wrap-break-words ${
                !message
                  ? "bg-transparent border-2 border-app-border font-bold text-app-border cursor-default"
                  : "bg-green-500 text-white cursor-pointer"
              }`}
              disabled={!message}
            >
              Proyectar
            </button>

            <button
              onClick={() => {
                setMessage("");
                setNumEditando(null);
              }}
              className="w-full py-1.5 flex items-center justify-center text-center text-xs sm:text-sm md:text-base wrap-break-words font-bold text-app-muted rounded inset-shadow-sm inset-shadow-app-muted hover:text-app-error hover:inset-shadow-app-error cursor-pointer"
            >
              Cancelar
            </button>

            <BotonSalida className="w-full py-1.5" />

            {/* Boton visibilidad ticker, titulo, texto */}
            {isDesktop ? (
              <div className="flex items-center gap-4">
                {/* Boton visibilidad ticker */}
                <button
                  onClick={toggleVisibleTicker}
                  className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all
              duration-200"
                >
                  {visibleTicker ? (
                    <TagIcon className="w-8 h-8 text-app-success" />
                  ) : (
                    <TagIcon className="w-8 h-8" />
                  )}
                </button>
                {/* Boton visibilidad titulo */}
                <button
                  onClick={toggleVisibleTitulo}
                  className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all
              duration-200"
                >
                  {visibleTitulo ? (
                    <BookmarkIcon className="w-8 h-8 text-app-accent" />
                  ) : (
                    <BookmarkIcon className="w-8 h-8" />
                  )}
                </button>
                {/* Boton visibilidad texto */}
                <button
                  onClick={toggleVisibleTexto}
                  className="h-full font-semibold text-app-muted px-2 flex items-center justify-center transition-all duration-200"
                >
                  {visibleTexto ? (
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-app-main" />
                  ) : (
                    <ChatBubbleLeftRightIcon className="w-8 h-8" />
                  )}
                </button>
                {/* Boton visibilidad solo texto */}
                <button
                  onClick={setAllVisible}
                  className="h-full font-semibold px-2 flex items-center justify-center transition-all duration-200"
                >
                  <TvIcon className="w-8 h-8 text-app-main" />
                </button>
              </div>
            ) : (
              <ModalVisibilidad
                toggleVisibleTicker={toggleVisibleTicker}
                toggleVisibleTitulo={toggleVisibleTitulo}
                toggleVisibleTexto={toggleVisibleTexto}
                setAllVisible={setAllVisible}
                colorClass={"text-app-main"}
              />
            )}
          </div>
        </div>
      </div>

      <FavoritosTexto
        etiqueta="Mensaje"
        items={messageItems}
        numProyectado={numProyectado}
        onProyectar={handleMessage}
        onEditar={editarFavorito}
        onEliminar={eliminarFavorito}
      />
    </div>
  );
}
