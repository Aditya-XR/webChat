import React, { useState } from 'react'
import assets from '../assets/assets'

const LoginPage = () => {

  const [currState, setCurrState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <div className='min-h-screen bg-cover bg-center flex items-center
    justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl'>
        {/* Left Section */}
        <img src={assets.logo_big} alt="" className='w-[min(30vw,250px)]'/>

        {/* Right Section */}
        <form className='border-2 bg-white/8 text-white border-gray-500 p-6 flex
        flex-col gap-6 rounded-lg shadow-lg'>
          <h2 className='font-medium text-2xl flex justify-between items-center'>
            {currState}
            <img src={assets.arrow_icon} alt="" className='w-5 cursor-pointer'/>
          </h2>

          {currState === "Sign up" && !isDataSubmitted && (
            <input onChange={(e)=>setFullName(e.target.value)} value={fullName}
             type="text" className='p-2 border border-gray-500 rounded-md
             focus:outline-none' placeholder='Full Name' required />
          )}

          {/*!isDataSubmitted => data not submitted*/}
          {!isDataSubmitted && (
            <>
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

          {
            currState === "Sign up" && isDataSubmitted && (
              <textarea onChange={(e)=>setBio(e.target.value)} value={bio}
               placeholder='Provide a short bio about yourself' rows={4} className='p-2 border border-gray-500
               rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'></textarea>
            )
          }

          <button type='submit' className='bg-gradient-to-r from-purple-400 to-violet-600
          text-white border-none text-sm font-light py-2 px-20 rounded-full
          cursor-pointer hover:from-purple-500 hover:to-violet-700
          transition-all duration-300'>
            {currState === "Sign up" ? "Create Account" : "Login Now"}
          </button>
          
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

          <div className='flex flex-col gap-2'>
            {currState === "Sign up" ? 
            (<p className='text-sm text-gray-600'>Already have an account? <span
               onClick={()=>{setCurrState("Login"); setIsDataSubmitted(false);}}
            className='font-medium text-violet-500 cursor-pointer'>Login here</span></p>)
             :
            (<p className='text-sm text-gray-600'>Create an account? <span onClick={()=> {setCurrState("Sign up"); setIsDataSubmitted(false);}} className='font-medium text-violet-500 cursor-pointer'>Click here</span></p>)}
          </div>
        </form>
    </div>
  )
}

export default LoginPage