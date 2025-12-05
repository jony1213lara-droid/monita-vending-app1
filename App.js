import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- CONFIGURACIÓN DE FIREBASE (Tomada de tu consola) ---
// NOTA: Esta configuración es necesaria para conectar la aplicación
// con tu proyecto 'MonitaVendingApp'.
const firebaseConfig = {
  apiKey: "AIzaSyDElF_1S2iH4sQ1G2c4k5E6f7I8j9B0A", // Tu clave API real
  authDomain: "monitavendingapp.firebaseapp.com",
  projectId: "monitavendingapp",
  storageBucket: "monitavendingapp.appspot.com",
  messagingSenderId: "60096924106",
  appId: "1:60096924106:web:1e4b34b73e8297e2db33",
  measurementId: "G-KH64ZBP7XP"
};

// Variables globales proporcionadas por el entorno de Canvas (necesarias para la autenticación)
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
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error durante la autenticación:", error);
      }
    };

    authenticate();

    // Listener para el estado de autenticación
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 3. Conexión a Firestore (Lectura de datos en tiempo real)
  useEffect(() => {
    // Solo se ejecuta si la autenticación está lista y tenemos un ID de usuario
    if (!isAuthReady || !userId) return;

    // Ruta de la colección: /artifacts/{appId}/public/data/messages
    // Usamos 'public' para que todos los usuarios puedan ver los mensajes.
    const messagesCollectionRef = collection(db, `/artifacts/${appId}/public/data/messages`);
    const q = query(messagesCollectionRef);

    // Escucha en tiempo real (onSnapshot)
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordenar en memoria por marca de tiempo, ya que 'orderBy' puede requerir índices.
      msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setMessages(msgs);
      console.log("Datos de mensajes actualizados.");
    }, (error) => {
      console.error("Error al obtener mensajes de Firestore:", error);
    });

    return () => unsubscribeSnapshot();
  }, [isAuthReady, userId]); // Se ejecuta cuando el estado de autenticación cambia

  // 4. Función para enviar un nuevo mensaje
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    try {
      const messagesCollectionRef = collection(db, `/artifacts/${appId}/public/data/messages`);
      await addDoc(messagesCollectionRef, {
        text: newMessage,
        userId: userId,
        timestamp: serverTimestamp(),
        // Nombre de usuario simple para identificar (puedes expandir esto)
        username: `Usuario-${userId.substring(0, 4)}`
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
    }
  };

  // 5. Interfaz de usuario
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-medium text-gray-700">Cargando aplicación...</div>
      </div>
    );
  }

  // Estilos Tailwind CSS para una interfaz de chat móvil/web
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
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20"> {/* Se agregó padding para el footer */}
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-10">¡Sé el primero en enviar un mensaje!</div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs sm:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md ${
                msg.userId === userId
                  ? 'bg-indigo-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-tl-none'
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${msg.userId === userId ? 'text-indigo-200' : 'text-indigo-600'}`}>
                {msg.username || 'Usuario Anónimo'}
              </div>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <div className="text-right text-xs mt-1 opacity-70">
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