"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { UpcomingContact } from "@/lib/upcoming-events";

type UpcomingAttendeesTableProps = {
  contacts: UpcomingContact[];
};

type RatingButtonProps = {
  value?: number;
  playerName: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

function RatingButton({ value, playerName, onClick }: RatingButtonProps) {
  if (!value) {
    return <strong className="font-semibold text-primary-900">&mdash;</strong>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded font-semibold text-primary-900 underline decoration-primary-300 underline-offset-2 transition-colors hover:text-primary-600 hover:decoration-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
      aria-label={`View ${playerName}'s full ratings`}
    >
      {value}
    </button>
  );
}

function RatingRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center justify-between gap-6 py-2 text-sm">
      <dt className="text-gray-700">{label}</dt>
      <dd className="font-semibold tabular-nums text-primary-900">
        {value || <span className="text-gray-400">&mdash;</span>}
      </dd>
    </div>
  );
}

export default function UpcomingAttendeesTable({ contacts }: UpcomingAttendeesTableProps) {
  const [selectedContact, setSelectedContact] = useState<UpcomingContact | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedContact && !dialog.open) {
      dialog.showModal();
    }
  }, [selectedContact]);

  const openDetails = (
    contact: UpcomingContact,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    triggerRef.current = event.currentTarget;
    setSelectedContact(contact);
  };

  const closeDetails = () => {
    dialogRef.current?.close();
  };

  const handleDialogClose = () => {
    setSelectedContact(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) closeDetails();
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 font-semibold text-primary-900">#</th>
              <th className="px-4 py-3 font-semibold text-primary-900">Name</th>
              <th className="px-4 py-3 font-semibold text-primary-900">FIDE ID</th>
              <th className="px-4 py-3 font-semibold text-primary-900">Ratings</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, index) => {
              const playerName = `${contact.firstName} ${contact.lastName}`;
              const hasRatings = contact.fideStandard || contact.acfClassic;

              return (
                <tr
                  key={contact.fideId || index}
                  className="border-b border-gray-50 last:border-0 transition-colors hover:bg-primary-50/40"
                >
                  <td className="px-4 py-2.5 tabular-nums text-gray-600">{index + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{playerName}</td>
                  <td className="px-4 py-2.5">
                    {contact.fideId ? (
                      <a
                        href={`https://ratings.fide.com/profile/${contact.fideId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        {contact.fideId}
                      </a>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {hasRatings ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-baseline gap-1 text-gray-700">
                          <span>FIDE</span>
                          <RatingButton
                            value={contact.fideStandard}
                            playerName={playerName}
                            onClick={(event) => openDetails(contact, event)}
                          />
                        </span>
                        <span className="inline-flex items-baseline gap-1 text-gray-700">
                          <span>ACF</span>
                          <RatingButton
                            value={contact.acfClassic}
                            playerName={playerName}
                            onClick={(event) => openDetails(contact, event)}
                          />
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        onClose={handleDialogClose}
        onClick={handleDialogClick}
        aria-labelledby="upcoming-player-rating-title"
        className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-gray-200 bg-white p-0 text-primary-900 shadow-2xl backdrop:bg-primary-950/40"
      >
        {selectedContact && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Player ratings</p>
                <h3 id="upcoming-player-rating-title" className="mt-1 text-2xl font-black tracking-tight">
                  {selectedContact.firstName} {selectedContact.lastName}
                </h3>
                {(selectedContact.fideId || selectedContact.acfId) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                    {selectedContact.fideId && (
                      <span>
                        FIDE ID {" "}
                        <a
                          href={`https://ratings.fide.com/profile/${selectedContact.fideId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-900"
                        >
                          {selectedContact.fideId}
                        </a>
                      </span>
                    )}
                    {selectedContact.acfId && <span>ACF ID {selectedContact.acfId}</span>}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h4 className="font-bold text-primary-900">FIDE Ratings</h4>
                <dl className="mt-2 divide-y divide-gray-200">
                  <RatingRow label="Standard" value={selectedContact.fideStandard} />
                  <RatingRow label="Rapid" value={selectedContact.fideRapid} />
                  <RatingRow label="Blitz" value={selectedContact.fideBlitz} />
                </dl>
              </section>
              <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h4 className="font-bold text-primary-900">ACF Ratings</h4>
                <dl className="mt-2 divide-y divide-gray-200">
                  <RatingRow label="Classic" value={selectedContact.acfClassic} />
                  <RatingRow label="Quick" value={selectedContact.acfQuick} />
                </dl>
              </section>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
