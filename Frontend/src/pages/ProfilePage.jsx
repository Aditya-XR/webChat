import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import assets from '../assets/assets';

const ProfilePage = () => {

  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const [name, setName] = useState("Martin Johnson");
  const [bio, setBio] = useState("Hi there! I'm using WebChat.");

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    console.log("Profile updated:", { name, bio, image: selectedImage });
    // Add your profile update logic here
  }

  return (
    <div className='min-h-screen bg-cover bg-no-repeat flex items-center justify-center'>
        <div className='w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2
        border-gray-600 flex items-center justify-between max-sm:flex-col-reverse
        rounded-lg'>
          <form onSubmit={onSubmitHandler} className='flex flex-col gap-5 p-10 flex-1'>
            <h3 className='text-lg'>Profile Information</h3>
            <label htmlFor="avatar" className='flex items-center gap-3 cursor-pointer'>
              <input onChange={(e)=>setSelectedImage(e.target.files[0])} type="file" id="avatar" accept='.png, .jpg, .jpeg' hidden/>
              <img src={selectedImage ? URL.createObjectURL(selectedImage) : 
                assets.avatar_icon} alt="" className={`w-12 h-12 ${selectedImage && 'rounded-full'}`} />
              upload profile picture
            </label>
            <input onChange={(e)=>setName(e.target.value)} value={name} 
             type="text" required placeholder='Your name' className='p-2 border
            border-gray-500 rounded-md focus:outline-none focus:ring-2' />
            <textarea onChange={(e)=>setBio(e.target.value)} value={bio} 
             placeholder='Your bio' className='p-2 border border-gray-500
            rounded-md focus:outline-none focus:ring-2 resize-none h-24'/>
            <button type='submit' className='bg-indigo-600 hover:bg-indigo-700
            transition-colors text-white py-2 rounded-md mt-2'>Save Changes</button>
            <button onClick={()=>navigate(-1)} type='button' className='text-gray-400
            hover:text-white transition-colors py-2 rounded-md mt-2'>Go Back</button>
          </form>
          <img src={selectedImage ? URL.createObjectURL(selectedImage) : assets.logo_icon} alt="" className='max-w-[160px] my-5 rounded-full mx-auto' />
        </div>
    </div>
  )
}

export default ProfilePage