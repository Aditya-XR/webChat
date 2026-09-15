import React, { useContext, useEffect, useState } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { ChatContext } from '../../context/ChatContext'

const Sidebar = () => {
    const {
        getUsers,
        users,
        selectedUser,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        pendingRequests,
        getPendingRequests,
        searchUsers,
        sendInvite,
        acceptInvite,
        rejectInvite,
    } = useContext(ChatContext);

    const {getUsers, users, selectedUser, setSelectedUser, unseenMessages, setUnseenMessages} = useContext(ChatContext);
    const { logout, onlineUsers } = useContext(AuthContext);

    const {logout, onlineUsers} = useContext(AuthContext);

    const [inputValue, setInputValue] = useState("");
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingInviteId, setSendingInviteId] = useState(null);

    const navigate = useNavigate();

    const filteredUsers = inputValue
        ? users.filter((user) => user.fullName.toLowerCase().includes(inputValue.toLowerCase()))
        : users;

    useEffect(() => {
        getUsers();
    }, [onlineUsers]);

    // Handle searching users to invite
    useEffect(() => {
        const query = searchQuery.trim();
        if (!query) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            const results = await searchUsers(query);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSendInvite = async (recipientId) => {
        setSendingInviteId(recipientId);
        const success = await sendInvite(recipientId);
        if (success) {
            // Update local search results state
            setSearchResults((prev) =>
                prev.map((u) => (u._id === recipientId ? { ...u, relationshipStatus: "pending_sent" } : u))
            );
        }
        setSendingInviteId(null);
    };

    const handleAcceptAndChat = async (contactId) => {
        await acceptInvite(contactId);
        setShowRequestsModal(false);
    };

    const incomingCount = pendingRequests?.incoming?.length || 0;

    return (
        <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${selectedUser ? "max-md:hidden" : ''}`}>
            <div className='pb-5'>
        <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white flex flex-col ${selectedUser ? "max-md:hidden" : ''}`}>
            {/* Top Bar */}
            <div className='pb-4 border-b border-gray-700/40'>
                <div className='flex justify-between items-center'>
                    <img src={assets.logo} alt="Logo" className='max-w-40' />
                    <div className='relative group'>
                        <img src={assets.menu_icon} alt="Menu" className='h-5 w-5 cursor-pointer' />
                        <div className='absolute top-0 right-0 pt-8 z-20 hidden
                    group-hover:block'>
                            <div className='w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100'>
                                <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm'>Edit Profile</p>
                                <hr className='my-2 border-t border-gray-500' />
                                <p onClick={() => logout()} className='cursor-pointer text-sm'>Logout</p>
                    <img src={assets.logo} alt="Logo" className='max-w-36' />
                    
                    <div className='flex items-center gap-3'>
                        {/* Add Contact / Invite Button */}
                        <button
                            onClick={() => {
                                setShowInviteModal(true);
                                setSearchQuery("");
                                setSearchResults([]);
                            }}
                            title="Invite New Contact"
                            className='p-1.5 rounded-full bg-violet-600/60 hover:bg-violet-600 text-white transition flex items-center justify-center cursor-pointer shadow'
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>

                        {/* Pending Requests Bell Icon */}
                        <div className='relative'>
                            <button
                                onClick={() => {
                                    getPendingRequests();
                                    setShowRequestsModal(true);
                                }}
                                title="Chat Invitations"
                                className='p-1.5 rounded-full bg-[#282142] hover:bg-[#392f5e] text-white transition flex items-center justify-center cursor-pointer'
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </button>
                            {incomingCount > 0 && (
                                <span className='absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse'>
                                    {incomingCount}
                                </span>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className='relative group'>
                            <img src={assets.menu_icon} alt="Menu" className='h-5 w-5 cursor-pointer opacity-80 hover:opacity-100' />
                            <div className='absolute top-0 right-0 pt-8 z-20 hidden group-hover:block'>
                                <div className='w-32 p-4 rounded-md bg-[#282142] border border-gray-600 text-gray-100 shadow-xl'>
                                    <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm hover:text-violet-300'>Edit Profile</p>
                                    <hr className='my-2 border-t border-gray-600' />
                                    <p onClick={() => logout()} className='cursor-pointer text-sm text-red-400 hover:text-red-300'>Logout</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5'>
                    <img src={assets.search_icon} alt="Search" className="w-3" />
                    <input onChange={(e) => setInputValue(e.target.value)} type="text" className=' bg-transparent border-none outline-none
                     text-white text-xs placeholder-[#c8c8c8] flex-1' placeholder='Search User...' />
                {/* Search Contacts Input */}
                <div className='bg-[#282142] rounded-full flex items-center gap-2 py-2.5 px-4 mt-4 border border-gray-700/50'>
                    <img src={assets.search_icon} alt="Search" className="w-3 opacity-60" />
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        type="text"
                        className='bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1'
                        placeholder='Search chats...'
                    />
                </div>
            </div>

            <div className='flex flex-col'>
                {filteredUsers.map((user, index)=>(
                    <div onClick={()=> {setSelectedUser(user); setUnseenMessages(prev=>
                    ({...prev, [user._id]: 0}))}}
                        key={index} className={`relative flex items-center gap-2 p-2 pl-4
                         rounded cursor-pointer max-sm:text-sm ${selectedUser?._id === user._id && 'bg-[#282142]/50'}`}>
                        <img src={user?.profilePic || assets.avatar_icon} alt=""
                        className='w-8.75 aspect-square rounded-full'/>
                        <div className='flex flex-col leading-5'>
                            <p>{user.fullName}</p>
                            {
                                onlineUsers.includes(user._id)
                                ? <span className='text-green-400 text-xs'>Online</span>
                                : <span className='text-neutral-400 text-xs'>Offline</span>
                            }
            {/* Contacts List Header */}
            <div className='flex justify-between items-center pt-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider'>
                <span>Contacts ({users.length})</span>
                {incomingCount > 0 && (
                    <button
                        onClick={() => setShowRequestsModal(true)}
                        className='text-violet-400 hover:text-violet-300 cursor-pointer font-normal normal-case'
                    >
                        {incomingCount} pending invite{incomingCount > 1 ? 's' : ''}
                    </button>
                )}
            </div>

            {/* Contacts List */}
            <div className='flex flex-col flex-1 overflow-y-auto space-y-1 pr-0.5'>
                {filteredUsers.length === 0 ? (
                    <div className='py-12 px-4 text-center text-gray-400 text-xs flex flex-col items-center gap-2'>
                        {inputValue ? (
                            <p>No matching contacts</p>
                        ) : (
                            <>
                                <p className='text-sm text-gray-300 font-medium'>No chats yet</p>
                                <p className='text-[11px] text-gray-400 max-w-[200px]'>
                                    Invite friends using the <strong>+</strong> button above to start chatting!
                                </p>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className='mt-2 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs cursor-pointer font-medium'
                                >
                                    + Invite a Contact
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    filteredUsers.map((user, index) => (
                        <div
                            onClick={() => {
                                setSelectedUser(user);
                                setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
                            }}
                            key={user._id || index}
                            className={`relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${
                                selectedUser?._id === user._id ? 'bg-[#282142] border border-violet-500/40' : 'hover:bg-[#282142]/40'
                            }`}
                        >
                            <div className='relative'>
                                <img
                                    src={user?.profilePic || assets.avatar_icon}
                                    alt=""
                                    className='w-10 h-10 aspect-square rounded-full object-cover'
                                />
                                {onlineUsers.includes(user._id) && !user.isBlocked && (
                                    <span className='absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#1a162b]'></span>
                                )}
                            </div>

                            <div className='flex flex-col flex-1 min-w-0 leading-tight'>
                                <div className='flex justify-between items-center'>
                                    <p className='font-medium text-sm truncate'>{user.fullName}</p>
                                </div>
                                <div className='flex items-center gap-1.5 text-xs mt-0.5'>
                                    {user.isBlockedByMe ? (
                                        <span className='text-rose-400 text-[11px] font-medium'>Blocked</span>
                                    ) : user.isBlockedByOther ? (
                                        <span className='text-gray-500 text-[11px]'>Unavailable</span>
                                    ) : onlineUsers.includes(user._id) ? (
                                        <span className='text-green-400 text-[11px]'>Online</span>
                                    ) : (
                                        <span className='text-gray-400 text-[11px]'>Offline</span>
                                    )}
                                </div>
                            </div>

                            {unseenMessages[user._id] > 0 && (
                                <span className='text-xs h-5 min-w-[20px] px-1.5 flex justify-center items-center rounded-full bg-violet-600 text-white font-bold'>
                                    {unseenMessages[user._id]}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

                        {unseenMessages[user._id] > 0 && (
                            <p className='absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50'>
                                {unseenMessages[user._id]}
            {/* MODAL 1: Invite New Contact Modal */}
            {showInviteModal && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4'>
                    <div className='bg-[#1f1933] border border-gray-700 w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col text-white'>
                        <div className='flex justify-between items-center pb-3 border-b border-gray-700'>
                            <h2 className='text-base font-semibold'>Invite a Contact</h2>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className='text-gray-400 hover:text-white text-lg font-bold cursor-pointer'
                            >
                                ✕
                            </button>
                        </div>

                        <p className='text-xs text-gray-300 mt-3 mb-2'>
                            Search by name or email address to send a WhatsApp-style chat invitation:
                        </p>

                        <div className='bg-[#282142] rounded-lg flex items-center gap-2 p-2.5 border border-gray-600'>
                            <img src={assets.search_icon} alt="Search" className="w-3.5 opacity-60" />
                            <input
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                type="text"
                                className='bg-transparent border-none outline-none text-white text-xs placeholder-gray-400 flex-1'
                                placeholder='Type name or email...'
                            />
                        </div>

                        {/* Search Results */}
                        <div className='mt-4 max-h-60 overflow-y-auto space-y-2 pr-1'>
                            {isSearching ? (
                                <p className='text-xs text-gray-400 text-center py-4'>Searching...</p>
                            ) : searchResults.length === 0 ? (
                                searchQuery.trim() ? (
                                    <p className='text-xs text-gray-400 text-center py-4'>No users found matching "{searchQuery}"</p>
                                ) : (
                                    <p className='text-xs text-gray-500 text-center py-4'>Type to search registered users</p>
                                )
                            ) : (
                                searchResults.map((u) => (
                                    <div key={u._id} className='flex items-center justify-between p-2 rounded-lg bg-[#282142]/60 hover:bg-[#282142]'>
                                        <div className='flex items-center gap-2.5 min-w-0'>
                                            <img
                                                src={u.profilePic || assets.avatar_icon}
                                                alt=""
                                                className='w-8 h-8 rounded-full object-cover'
                                            />
                                            <div className='truncate'>
                                                <p className='text-xs font-medium text-white truncate'>{u.fullName}</p>
                                                <p className='text-[10px] text-gray-400 truncate'>{u.email}</p>
                                            </div>
                                        </div>

                                        <div>
                                            {u.relationshipStatus === "accepted" ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(u);
                                                        setShowInviteModal(false);
                                                    }}
                                                    className='px-2.5 py-1 text-xs bg-emerald-600/80 hover:bg-emerald-600 rounded-md text-white font-medium cursor-pointer'
                                                >
                                                    Chat
                                                </button>
                                            ) : u.relationshipStatus === "pending_sent" ? (
                                                <span className='px-2.5 py-1 text-[11px] bg-gray-700 rounded-md text-gray-300 font-medium'>
                                                    Invited
                                                </span>
                                            ) : u.relationshipStatus === "pending_received" ? (
                                                <button
                                                    onClick={async () => {
                                                        await handleAcceptAndChat(u.contactId);
                                                        setShowInviteModal(false);
                                                    }}
                                                    className='px-2.5 py-1 text-xs bg-violet-600 hover:bg-violet-500 rounded-md text-white font-medium cursor-pointer'
                                                >
                                                    Accept
                                                </button>
                                            ) : u.relationshipStatus === "blocked" ? (
                                                <span className='px-2.5 py-1 text-[11px] bg-rose-900/60 text-rose-300 rounded-md font-medium'>
                                                    Blocked
                                                </span>
                                            ) : (
                                                <button
                                                    disabled={sendingInviteId === u._id}
                                                    onClick={() => handleSendInvite(u._id)}
                                                    className='px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 rounded-md text-white font-medium cursor-pointer disabled:opacity-50'
                                                >
                                                    {sendingInviteId === u._id ? 'Sending...' : '+ Invite'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Pending Invitations Modal */}
            {showRequestsModal && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4'>
                    <div className='bg-[#1f1933] border border-gray-700 w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col text-white'>
                        <div className='flex justify-between items-center pb-3 border-b border-gray-700'>
                            <h2 className='text-base font-semibold'>Chat Invitations</h2>
                            <button
                                onClick={() => setShowRequestsModal(false)}
                                className='text-gray-400 hover:text-white text-lg font-bold cursor-pointer'
                            >
                                ✕
                            </button>
                        </div>

                        {/* Incoming Invitations */}
                        <div className='mt-4'>
                            <p className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2'>
                                Received ({incomingCount})
                            </p>
                        )}

                            <div className='max-h-52 overflow-y-auto space-y-2 pr-1'>
                                {incomingCount === 0 ? (
                                    <p className='text-xs text-gray-500 py-3 text-center'>No incoming invitations</p>
                                ) : (
                                    pendingRequests.incoming.map((req) => (
                                        <div key={req._id} className='flex items-center justify-between p-2.5 rounded-lg bg-[#282142] border border-gray-700/50'>
                                            <div className='flex items-center gap-2.5 min-w-0'>
                                                <img
                                                    src={req.requester?.profilePic || assets.avatar_icon}
                                                    alt=""
                                                    className='w-9 h-9 rounded-full object-cover'
                                                />
                                                <div className='truncate'>
                                                    <p className='text-xs font-medium text-white truncate'>{req.requester?.fullName}</p>
                                                    <p className='text-[10px] text-gray-400 truncate'>{req.requester?.email}</p>
                                                </div>
                                            </div>

                                            <div className='flex items-center gap-2'>
                                                <button
                                                    onClick={() => acceptInvite(req._id)}
                                                    className='px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-md text-white font-medium cursor-pointer'
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => rejectInvite(req._id)}
                                                    className='px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 font-medium cursor-pointer'
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Outgoing Invitations */}
                        <div className='mt-4 pt-3 border-t border-gray-700/50'>
                            <p className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2'>
                                Sent by You ({pendingRequests?.outgoing?.length || 0})
                            </p>

                            <div className='max-h-40 overflow-y-auto space-y-1.5 pr-1'>
                                {!pendingRequests?.outgoing?.length ? (
                                    <p className='text-xs text-gray-500 py-2 text-center'>No pending sent invitations</p>
                                ) : (
                                    pendingRequests.outgoing.map((req) => (
                                        <div key={req._id} className='flex items-center justify-between p-2 rounded-lg bg-[#282142]/50 text-xs'>
                                            <span className='truncate text-gray-300'>{req.recipient?.fullName || req.recipient?.email}</span>
                                            <button
                                                onClick={() => rejectInvite(req._id)}
                                                className='text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer'
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>        
                </div>
            )}
        </div>
    )
}
    );
};

export default Sidebar
export default Sidebar;
