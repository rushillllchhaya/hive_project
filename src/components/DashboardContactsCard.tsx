'use client';

import React, { useState } from 'react';
import type { BusinessContact, BusinessContactRole } from '@/types';
import {
  Users, Search, Plus, Phone, Mail, ChevronRight, X
} from 'lucide-react';

interface DashboardContactsCardProps {
  contacts: BusinessContact[];
  onAddContact: (contact: Partial<BusinessContact>) => void;
  onNavigateToAgents?: () => void;
}

export default function DashboardContactsCard({
  contacts,
  onAddContact,
  onNavigateToAgents,
}: DashboardContactsCardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'All' | BusinessContactRole>('All');
  const [modalOpen, setModalOpen] = useState(false);

  // New Contact Form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<BusinessContactRole>('Realtor');
  const [newAgency, setNewAgency] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filteredContacts = contacts.filter(c => {
    const matchesRole = selectedRole === 'All' || c.role === selectedRole;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.agency.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q));

    return matchesRole && matchesSearch;
  });

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddContact({
      name: newName.trim(),
      role: newRole,
      agency: newAgency.trim() || 'Independent Partner',
      email: newEmail.trim() || 'contact@realestate.com',
      phone: newPhone.trim() || '(303) 555-0100',
      dealsCount: 1,
      rating: 5.0,
      status: 'active',
      location: 'Denver Metro',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });

    setNewName('');
    setNewAgency('');
    setNewEmail('');
    setNewPhone('');
    setModalOpen(false);
  };

  const roleColors: Record<BusinessContactRole, string> = {
    Realtor: 'bg-blue-50 text-blue-700 border-blue-200',
    Broker: 'bg-purple-50 text-purple-700 border-purple-200',
    Inspector: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Client: 'bg-amber-50 text-amber-700 border-amber-200',
    Contractor: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between h-[520px]">
      {/* ── Top Header ── */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Contacts</h3>
                <span className="px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold font-mono">
                  {contacts.length}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border border-indigo-200/60"
          >
            <Plus className="w-3.5 h-3.5" /> New Contact
          </button>
        </div>

        {/* ── Search Input ── */}
        <div className="relative mt-2.5 mb-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search network contacts..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all font-medium"
          />
        </div>

        {/* ── Category Filter Pills ── */}
        <div className="flex items-center gap-1 pb-1.5 overflow-x-auto no-scrollbar text-[11px]">
          {(['All', 'Realtor', 'Broker', 'Inspector', 'Client'] as const).map(role => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`px-2 py-0.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedRole === role
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Contacts List ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 my-1">
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className="p-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex items-center justify-between gap-3 bg-white"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-slate-800 truncate">{contact.name}</h4>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${roleColors[contact.role] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {contact.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">
                  {contact.agency}
                </p>
                {contact.dealsCount ? (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {contact.dealsCount} deals connected
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${contact.phone}`}
                title={`Call ${contact.name}: ${contact.phone}`}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition-colors"
              >
                <Phone className="w-3 h-3" />
              </a>
              <a
                href={`mailto:${contact.email}`}
                title={`Email ${contact.name}: ${contact.email}`}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 flex items-center justify-center transition-colors"
              >
                <Mail className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}

        {filteredContacts.length === 0 && (
          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Users className="w-6 h-6 text-slate-300 mb-1" />
            <p className="text-xs text-slate-500 font-medium">No contacts match filter</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedRole('All'); }}
              className="text-[11px] text-blue-600 font-bold hover:underline mt-1 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Footer Link ── */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 font-medium">
          Manage professional network
        </span>
        <button
          type="button"
          onClick={onNavigateToAgents}
          className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          Full Directory <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Quick Add Contact Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3.5 animate-fade-up">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Business Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Jessica Williams"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as BusinessContactRole)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-medium"
                  >
                    <option value="Realtor">Realtor</option>
                    <option value="Broker">Broker</option>
                    <option value="Inspector">Inspector</option>
                    <option value="Client">Client</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Agency / Firm
                  </label>
                  <input
                    type="text"
                    value={newAgency}
                    onChange={e => setNewAgency(e.target.value)}
                    placeholder="e.g. Compass CO"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. jessica@compass.com"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="e.g. (303) 555-0199"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-medium"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
