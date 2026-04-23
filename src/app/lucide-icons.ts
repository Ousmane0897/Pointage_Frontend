import { importProvidersFrom } from '@angular/core';
import {
  LucideAngularModule,
  Activity, AlertCircle, AlertTriangle, AlignLeft, Archive, ArchiveX,
  ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Award, BadgeCheck, Banknote,
  BarChart3, Bell, BookOpen, Briefcase, Building2, Calculator, Calendar,
  CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CalendarX,
  CalendarX2, ChartBar, Check, CheckCircle, CheckCircle2, CheckSquare,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown,
  CircleDollarSign, ClipboardCheck, ClipboardList, Clock, CreditCard, Crown,
  Download, ExternalLink, Eye, File, FileBarChart, FileCheck, FileCheck2,
  FileDown, FilePlus, FilePlus2, FileQuestion, FileSearch, FileSignature,
  FileSpreadsheet, FileText, FileX, Filter, FolderArchive, FolderOpen,
  GitBranch, GraduationCap, HeartPulse, History, IdCard, Inbox, Infinity,
  Info, LayoutGrid, ListChecks, Loader, LoaderCircle, Lock, Mail, MapPin,
  MapPinCheck, MapPinHouse, MessageSquare, Minus, Network, NotebookPen,
  Package, Paperclip, Pencil, Phone, PieChart, Plane, Play, PlayCircle,
  Plus, Printer, RefreshCw, RotateCcw, Save, Search, Send, Sheet,
  ShieldAlert, Star, Table, Target, TimerReset, Trash2, TrendingDown,
  TrendingUp, TriangleAlert, Upload, UploadCloud, User, UserCheck,
  UserMinus, UserPlus, UserX, Users, Wallet, X, XCircle, Zap,
} from 'lucide-angular';

// Ajouter ici toute nouvelle icône référencée par <lucide-icon name="..."> dans les templates.
export const LucideIconsProvider = importProvidersFrom(
  LucideAngularModule.pick({
    Activity, AlertCircle, AlertTriangle, AlignLeft, Archive, ArchiveX,
    ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Award, BadgeCheck, Banknote,
    BarChart3, Bell, BookOpen, Briefcase, Building2, Calculator, Calendar,
    CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CalendarX,
    CalendarX2, ChartBar, Check, CheckCircle, CheckCircle2, CheckSquare,
    ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown,
    CircleDollarSign, ClipboardCheck, ClipboardList, Clock, CreditCard, Crown,
    Download, ExternalLink, Eye, File, FileBarChart, FileCheck, FileCheck2,
    FileDown, FilePlus, FilePlus2, FileQuestion, FileSearch, FileSignature,
    FileSpreadsheet, FileText, FileX, Filter, FolderArchive, FolderOpen,
    GitBranch, GraduationCap, HeartPulse, History, IdCard, Inbox, Infinity,
    Info, LayoutGrid, ListChecks, Loader, LoaderCircle, Lock, Mail, MapPin,
    MapPinCheck, MapPinHouse, MessageSquare, Minus, Network, NotebookPen,
    Package, Paperclip, Pencil, Phone, PieChart, Plane, Play, PlayCircle,
    Plus, Printer, RefreshCw, RotateCcw, Save, Search, Send, Sheet,
    ShieldAlert, Star, Table, Target, TimerReset, Trash2, TrendingDown,
    TrendingUp, TriangleAlert, Upload, UploadCloud, User, UserCheck,
    UserMinus, UserPlus, UserX, Users, Wallet, X, XCircle, Zap,
  })
);
