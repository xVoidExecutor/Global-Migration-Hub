          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="mb-2 text-sm font-medium text-foreground">Add a new document section</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label htmlFor="newGroupName" className="text-xs font-medium text-muted-foreground">
                Document name:
              </label>
              <input
                id="newGroupName"
                list="new-app-doc-group-suggestions"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Passport, Offer Letter, Demand Letter"
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              />
              <datalist id="new-app-doc-group-suggestions">
                {DEFAULT_DOCUMENT_GROUPS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <label
              className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ${
                newGroupName.trim() ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-50"
              }`}
            >
              <Upload className="size-4" />
              Choose file(s)
              <input
                ref={newGroupFileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                disabled={!newGroupName.trim()}
                className="hidden"
                onChange={(e) => handleNewGroupFiles(e.target.files)}
              />
            </label>
            {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Max 4 MB per file. Section names are fully custom — rename or delete any section before
              creating the application, or edit them later from the application&apos;s details page.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          {formError && <p className="text-xs text-destructive sm:mr-auto">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button type="submit" className="h-9 px-4 text-sm">
              Create Application
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
