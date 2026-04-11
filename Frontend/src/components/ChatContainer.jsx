import React, { useContext, useEffect, useRef, useState } from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ChatContainer = () => {

  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, deleteMessage } = useContext(ChatContext) // get selectedUser from context
  const { authUser, onlineUsers } = useContext(AuthContext) // get messages from context

  const scrollEnd = useRef()
  const longPressTimer = useRef(null)
  const messageMenuRef = useRef(null)
  const previousMessageCount = useRef(0)
  const previousSelectedUserId = useRef(null)

  const [input, setInput] = useState('')
  const [activeMessageMenu, setActiveMessageMenu] = useState(null)
  const [pendingDeleteIds, setPendingDeleteIds] = useState([])
  const senderAvatar = authUser?.profilePic || assets.avatar_icon
  const receiverAvatar = selectedUser?.profilePic || assets.avatar_icon
  const selectedUserName = selectedUser?.fullName || selectedUser?.name || 'Unknown User'

  const closeMessageMenu = () => setActiveMessageMenu(null)

  const openMessageMenu = (position, messageId) => {
    const menuWidth = 180
    const menuHeight = 64
    const x = Math.max(12, Math.min(position.x, window.innerWidth - menuWidth))
    const y = Math.max(12, Math.min(position.y, window.innerHeight - menuHeight))

    setActiveMessageMenu({ messageId, x, y })
  }

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMessageContextMenu = (event, message) => {
    const isOwnMessage = String(message.senderId) === String(authUser?._id)

    if (!isOwnMessage || message.isDeleted) {
      return
    }

    event.preventDefault()
    handleDeleteMessage(message._id)
  }

  const handleMessageTouchStart = (event, message) => {
    const isOwnMessage = String(message.senderId) === String(authUser?._id)
    const touch = event.touches?.[0]

    if (!isOwnMessage || message.isDeleted || !touch) {
      return
    }

    clearLongPressTimer()
    const touchPosition = { x: touch.clientX, y: touch.clientY }

    longPressTimer.current = setTimeout(() => {
      openMessageMenu(touchPosition, message._id)
    }, 550)
  }

  const handleDeleteMessage = async (messageId) => {
    closeMessageMenu()

    if (pendingDeleteIds.includes(messageId)) {
      return
    }

    const confirmed = window.confirm('Delete this message for everyone?')

    if (!confirmed) {
      return
    }

    setPendingDeleteIds((prev) => [...prev, messageId])

    try {
      await deleteMessage(messageId)
    } finally {
      setPendingDeleteIds((prev) => prev.filter((id) => id !== messageId))
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const didSend = await sendMessage(selectedUser._id, input, null);
    if (!didSend) return;
    setInput('');
    getMessages(selectedUser._id);
  }

  //handle sending an image
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/'))
    {
      toast.error("Please select a valid image file");
      return;
    }

    const didSend = await sendMessage(selectedUser._id, '', file);
    if (!didSend) {
      e.target.value = '';
      return;
    }
    e.target.value = '';
    getMessages(selectedUser._id);
  }

  useEffect(()=> {
    if(selectedUser) {
      getMessages(selectedUser._id);
      closeMessageMenu()
    }
  },[selectedUser])

  useEffect(() => {
    const selectedUserChanged = previousSelectedUserId.current !== selectedUser?._id
    const messageCountChanged = previousMessageCount.current !== messages.length

    if (scrollEnd.current && messages.length > 0 && (selectedUserChanged || messageCountChanged)) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" })
    }

    previousMessageCount.current = messages.length
    previousSelectedUserId.current = selectedUser?._id || null
  }, [messages, selectedUser])

  useEffect(() => {
    if (!activeMessageMenu) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
        closeMessageMenu()
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeMessageMenu()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [activeMessageMenu])

  useEffect(() => {
    return () => {
      clearLongPressTimer()
    }
  }, [])

  return selectedUser ? (
    <div className='h-full overflow-scroll relative backdrop-blur-sm'>

      {/*----- Chat header-----*/}
      <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500'>
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt={selectedUserName}
          className='h-10 w-10 rounded-full object-cover'
        />
        <div className='flex-1 min-w-0'>
          <p className='truncate text-base font-medium text-white md:text-lg'>
            {selectedUserName}
          </p>
          <p className='text-xs text-stone-300 md:text-sm'>
            {onlineUsers.includes(selectedUser._id) ? 'online' : 'offline'}
          </p>
        </div>
        <img onClick={() => setSelectedUser(null)} src={assets.arrow_icon} alt="" className='md:hidden max-w-7' />
        <img src={assets.help_icon} alt="" className='max-md:hidden max-w-5' />
      </div>

      {/*----- Chat area-----*/}
      <div className='flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6'>
        {messages.map((msg) => {
          const isOwnMessage = String(msg.senderId) === String(authUser?._id)

          return (
            <div key={msg._id} className={`flex items-end gap-2 justify-end ${!isOwnMessage && 'flex-row-reverse'}`}>
              <div
                className='relative'
                onContextMenu={(event) => handleMessageContextMenu(event, msg)}
                onTouchStart={(event) => handleMessageTouchStart(event, msg)}
                onTouchEnd={clearLongPressTimer}
                onTouchMove={clearLongPressTimer}
                onTouchCancel={clearLongPressTimer}
              >
                {msg.isDeleted ? (
                  <p className={`p-2 max-w-50 md:text-sm italic rounded-lg mb-8 break-words bg-white/10 text-stone-300
                     ${isOwnMessage ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                    This message was deleted
                  </p>
                ) : msg.image ? (
                  <img src={msg.image} alt="" className='max-w-57.5 border border-gray-700 rounded-lg overflow-hidden mb-8' />
                ) : (
                  <p className={`p-2 max-w-50 md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white
                     ${isOwnMessage ? 'rounded-br-none' : 'rounded-bl-none'}`}>{msg.text}</p>
                )}
              </div>
              <div className='text-center text-xs'>
                <img src={isOwnMessage ? senderAvatar : receiverAvatar}
                  alt="" className='w-7 rounded-full' />
                <p className='text-gray-500'>{formatMessageTime(msg.createdAt)}</p>
              </div>
            </div>
          )
        })}

        <div ref={scrollEnd}></div>
      </div>

      {activeMessageMenu && (
        <div
          ref={messageMenuRef}
          className='fixed z-30 min-w-40 rounded-xl border border-white/10 bg-[#1f1f27] p-2 shadow-2xl backdrop-blur-md'
          style={{ top: activeMessageMenu.y, left: activeMessageMenu.x }}
        >
          <button
            type='button'
            onClick={() => handleDeleteMessage(activeMessageMenu.messageId)}
            disabled={pendingDeleteIds.includes(activeMessageMenu.messageId)}
            className='w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {pendingDeleteIds.includes(activeMessageMenu.messageId) ? 'Deleting...' : 'Delete for everyone'}
          </button>
        </div>
      )}

      {/* ----- bottom area ----- */}
      <div className='absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3'>
        <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full' >
          <input onChange={(e) => setInput(e.target.value)} value={input}
          onKeyDown={(e)=> e.key === "Enter" ? handleSendMessage(e) : null}
           type="text" placeholder='Send a message'
            className='flex-1 text-sm p-3 border-none rounded-lg outline-none
          text-white placeholder-gray-400'/>
          <input onChange={handleSendImage} type="file" id='image' accept='image/png, image/jpeg' hidden />
          <label htmlFor="image">
            <img src={assets.gallery_icon} alt="" className='w-5 mr-2 cursor-pointer' />
          </label>
        </div>
        <img onClick={handleSendMessage} src={assets.send_button} alt="" className='w-7 cursor-pointer' />
      </div>
      

    </div>
  ) : (
    <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>
      <img src={assets.logo_icon} className='max-w-16' alt="" />
      <p className='text-lg font-medium text-white'>Select a user to start chatting</p>
    </div>
  )
}

export default ChatContainer
