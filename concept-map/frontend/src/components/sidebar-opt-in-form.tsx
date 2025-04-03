import { useState } from "react"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"

export function SidebarOptInForm({ 
  freeMessage = "We're offering all premium features for free during our beta period. Enjoy!" 
}: { 
  freeMessage?: string 
}) {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Go Premium
          </CardTitle>
          <CardDescription>
            Unlock advanced features and unlimited concept maps.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2.5 p-4">
          <Button
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground shadow-none hover:bg-sidebar-primary/90"
            size="sm"
            onClick={() => setOpen(true)}
          >
            Upgrade Now
          </Button>
        </CardContent>
      </Card>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Premium Features
            </DialogTitle>
            <DialogDescription>
              {freeMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              className="w-full" 
              onClick={() => setOpen(false)}
            >
              Get back to learning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 