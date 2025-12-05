import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- CONFIGURACIÓN DE FIREBASE (Tomada de tu consola) ---
// La aplicación usa estas claves para conectarse a tu proyecto 'MonitaVendingApp'.
const firebaseConfig = {
  apiKey: "AIzaSyDElF_1S2iH4sQ1G2c4k5E6f7I8j9B0A", // Tu clave API real
  authDomain: "monitavendingapp.firebaseapp.com",
  projectId: "monitavendingapp",
  storageBucket: "monitavendingapp.appspot.com",
  messagingSenderId: "60096924106",
  appId: "1:60096924106:web:1e4b34b73e8297e2db33",
  measurementId: "G-KH64ZBP7XP"
};

// Variables globales necesarias para el entorno de Canvas (se usan para la autenticación)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// 1. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Componente principal de la aplicación
const App = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // 2. Manejo de Autenticación y Carga Inicial
  useEffect(() => {
    // Autenticación inicial con Custom Token o anónima
    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          // Si no hay token personalizado, usa inicio de sesión anónimo
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error durante la autenticación:", error);
      }
    };

    authenticate();

    // Listener que se activa cuando el estado de autenticación cambia
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid); // Guarda el ID del usuario actual
      } else {
        setUserId(null);
      }
      setIsAuthReady(true); // Marca la autenticación como lista
      setLoading(false); // Detiene la pantalla de carga
    });

    return () => unsubscribeAuth(); // Limpia el listener al desmontar
  }, []);

  // 3. Conexión a Firestore (Lectura de datos en tiempo real)
  useEffect(() => {
    // Solo procede si la autenticación está lista y tenemos un ID de usuario válido
    if (!isAuthReady || !userId) return;

    // Define la ruta de la colección de mensajes (públicos para esta aplicación)
    const messagesCollectionRef = collection(db, `/artifacts/${appId}/public/data/messages`);
    const q = query(messagesCollectionRef);

    // Escucha en tiempo real (onSnapshot) para obtener mensajes
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordena los mensajes en memoria por marca de tiempo para mostrarlos en orden
      msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(msgs);
      console.log("Datos de mensajes actualizados.");
    }, (error) => {
      console.error("Error al obtener mensajes de Firestore:", error);
    });

    return () => unsubscribeSnapshot(); // Limpia el listener al desmontar
  }, [isAuthReady, userId]); // Depende del estado de autenticación

  // 4. Función para enviar un nuevo mensaje
  const sendMessage = async (e) => {
    e.preventDefault();
    // No envía si el mensaje está vacío o si no hay un ID de usuario
    if (!newMessage.trim() || !userId) return;

    try {
      const messagesCollectionRef = collection(db, `/artifacts/${appId}/public/data/messages`);
      await addDoc(messagesCollectionRef, {
        text: newMessage,
        userId: userId,
        timestamp: serverTimestamp(), // Marca de tiempo del servidor para ordenar
        // Genera un nombre de usuario simple para identificar
        username: `Usuario-${userId.substring(0, 4)}`
      });
      setNewMessage(''); // Limpia el campo de entrada
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
    }
  };

  // 5. Interfaz de usuario: Pantalla de Carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-medium text-gray-700">Cargando aplicación...</div>
      </div>
    );
  }

  // 6. Interfaz de usuario: Aplicación de Chat
  return (
    <div className="flex flex-col h-screen bg-gray-100 antialiased">
      {/* Encabezado */}
      <header className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-indigo-700">Monita Vending Chat (Beta)</h1>
        <div className="text-xs text-gray-500 bg-gray-200 p-1 rounded-full px-3">
          ID de Usuario: {userId}
        </div>
      </header>

      {/* Contenedor de Mensajes */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20"> {/* Se agrega padding para el footer */}
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-10">¡Sé el primero en enviar un mensaje!</div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`} // Alinea a la derecha si es el usuario actual
          >
            <div
              className={`max-w-xs sm:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md ${
                msg.userId === userId
                  ? 'bg-indigo-500 text-white rounded-br-none' // Estilo para mensajes propios
                  : 'bg-white text-gray-800 rounded-tl-none' // Estilo para mensajes de otros
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${msg.userId === userId ? 'text-indigo-200' : 'text-indigo-600'}`}>
                {msg.username || 'Usuario Anónimo'}
              </div>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <div className="text-right text-xs mt-1 opacity-70">
                {/* Muestra la hora del mensaje si ya tiene timestamp */}
                {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Enviando...'}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Formulario de Entrada */}
      <footer className="bg-white p-4 shadow-t-lg fixed bottom-0 left-0 right-0 z-10">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 outline-none transition duration-150"
            disabled={!userId}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl shadow-lg transition duration-300 ease-in-out disabled:bg-indigo-300"
            disabled={!newMessage.trim() || !userId}
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;

