/**
 * Created by ghyeok on 2017. 10. 04..
 */
import Firebase from 'firebase'

const firebaseApp = Firebase.initializeApp({
  apiKey: 'AIzaSyBwr23QyNxQx_9cHjGFXYbv7wTiVB2Gl9c',
  authDomain: 'naver-note-sender.firebaseapp.com',
  databaseURL: 'https://naver-note-sender.firebaseio.com',
  projectId: 'naver-note-sender',
  storageBucket: '',
  messagingSenderId: '845657923388'
})

export default firebaseApp
export const db = firebaseApp.database()
export const auth = firebaseApp.auth()
