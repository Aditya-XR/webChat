import React, { useContext, useEffect, useState } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';

const LoginPage = () => {
  const navigate = useNavigate();
  const [currState, setCurrState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { authUser, login, loginWithGoogle, updateProfile } = useContext(AuthContext);
  const needsBioSetup = authUser && localStorage.getItem("needsBioSetup") === "true";

  useEffect(() => {
    if (needsBioSetup) {
      setCurrState("Sign up");
    }
  }, [needsBioSetup]);

  const resetSignupFields = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setBio("");
    setAgreedToTerms(false);
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (needsBioSetup) {
      const didUpdateBio = await updateProfile({ bio });
      if (didUpdateBio) {
        localStorage.removeItem("needsBioSetup");
        navigate("/");
      }
      return;
    }

    if (currState === "Sign up") {
      if (!agreedToTerms) {
        alert("You must agree to the terms of use & privacy policy.");
        return;
      }

      const didCreateAccount = await login("Sign up", { fullName, email, password });
      if (didCreateAccount) {
        resetSignupFields();
        setCurrState("Login");
      }
      return;
    }

    await login("Login", { email, password });
  };

  const handleGoogleSignIn = async (credential) => {
    const didLogin = await loginWithGoogle(credential);

    if (didLogin && localStorage.getItem("needsBioSetup") !== "true") {
      navigate("/");
    }
  };

  return (
    <div className='min-h-screen bg-cover bg-center flex items-center
    justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl'>
        <img src={assets.logo_big} alt="" className='w-[min(30vw,250px)]'/>

        <form onSubmit={onSubmitHandler} className='border-2 bg-white/8 text-white border-gray-500 p-6 flex
        flex-col gap-6 rounded-lg shadow-lg'>
          <h2 className='font-medium text-2xl flex justify-between items-center'>
            {needsBioSetup ? "Complete Profile" : currState}
          </h2>

          {needsBioSetup ? (
            <>
              <p className='text-sm text-gray-300'>
                Add a short bio to finish setting up your account.
              </p>
              <textarea
                onChange={(e) => setBio(e.target.value)}
                value={bio}
                placeholder='Provide a short bio about yourself'
                rows={4}
                required
                className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
            </>
          ) : (
            <>
              {currState === "Sign up" && (
                <input onChange={(e)=>setFullName(e.target.value)} value={fullName}
                 type="text" className='p-2 border border-gray-500 rounded-md
                 focus:outline-none' placeholder='Full Name' required />
              )}

              <input onChange={(e)=>setEmail(e.target.value)} value={email}
               type="email" placeholder='Email Address' required className='p-2 border
                border-gray-500 rounded-md focus:outline-none focus:ring-2
                focus:ring-indigo-500'/>
              <input onChange={(e)=>setPassword(e.target.value)} value={password}
               type="password" placeholder='Password' required className='p-2 border
                border-gray-500 rounded-md focus:outline-none focus:ring-2
                focus:ring-indigo-500'/>
            </>
          )}

          <button type='submit' className='bg-gradient-to-r from-purple-400 to-violet-600
          text-white border-none text-sm font-light py-2 px-20 rounded-full
          cursor-pointer hover:from-purple-500 hover:to-violet-700
          transition-all duration-300'>
            {needsBioSetup ? "Update Bio" : currState === "Sign up" ? "Create Account" : "Login Now"}
          </button>

          {!needsBioSetup && (
            <GoogleSignInButton onCredentialResponse={handleGoogleSignIn} />
          )}

          {currState === "Sign up" && !needsBioSetup && (
            <div className='text-xs text-gray-300 flex gap-2 items-center
            justify-center'>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className='cursor-pointer'
              />
              <p>Agree to the terms of use & privacy policy</p>
            </div>
          )}

          {!needsBioSetup && (
            <div className='flex flex-col gap-2'>
              {currState === "Sign up" ?
              (<>
                <p className='text-sm text-gray-300'>
                  Check your inbox after signup. You must verify your email before logging in.
                </p>
                <p className='text-sm text-gray-600'>Already have an account? <span
                   onClick={()=>setCurrState("Login")}
                className='font-medium text-violet-500 cursor-pointer'>Login here</span></p>
              </>)
               :
              (<p className='text-sm text-gray-600'>Create an account? <span onClick={()=> {setCurrState("Sign up"); resetSignupFields();}} className='font-medium text-violet-500 cursor-pointer'>Click here</span></p>)}
            </div>
          )}
        </form>
    </div>
  )
}

export default LoginPage
