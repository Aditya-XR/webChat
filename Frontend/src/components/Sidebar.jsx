import React from 'react'
import assets from '../assets/assets'
import {useNavigate} from 'react-router-dom'

const Sidebar = ({selectedUser, setSelectedUser}) => {
    const navigate = useNavigate();
  return (
    <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${selectedUser ? "max-md:hidden" : ''}`}>
        <div className='pb-5'>
            <div className='flex justify-between items-center'>
                <img src={assets.logo} alt="Logo" className='max-w-40' />
                <div className='relative group'>
                    <img src={assets.menu_icon} alt="Menu" className='h-7 w-7 cursor-pointer p-2' />
                    <div className='absolute top-0 right-0 pt-11 z-20 hidden
                    group-hover:block'>
                        <div className='w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100'>
                            <p onClick={()=>navigate('/profile')} className='cursor-pointer text-sm'>Edit Profile</p>
                            <hr className='my-2 border-t border-gray-500' />
                            <p className='cursor-pointer text-sm'>Logout</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  )
}

export default Sidebar